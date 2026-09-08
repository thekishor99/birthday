var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var DATA_FILE = import_path.default.join(DATA_DIR, "shared_birthdays.json");
var PLAY_VALIDITY_MS = 7 * 24 * 60 * 60 * 1e3;
var PURGE_AFTER_MS = 30 * 24 * 60 * 60 * 1e3;
var sharedBirthdays = {};
function initStorage() {
  try {
    if (!import_fs.default.existsSync(DATA_DIR)) {
      import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (import_fs.default.existsSync(DATA_FILE)) {
      const content = import_fs.default.readFileSync(DATA_FILE, "utf-8");
      sharedBirthdays = JSON.parse(content);
      purgeExpiredCodes();
    }
  } catch (err) {
    console.error("Failed to initialize shared birthdays storage:", err);
    sharedBirthdays = {};
  }
}
function persistStorage() {
  try {
    if (!import_fs.default.existsSync(DATA_DIR)) {
      import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    import_fs.default.writeFileSync(DATA_FILE, JSON.stringify(sharedBirthdays, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist shared birthdays storage:", err);
  }
}
function purgeExpiredCodes() {
  const now = Date.now();
  let changed = false;
  for (const [code, item] of Object.entries(sharedBirthdays)) {
    if (!item || !item.savedAt || now - item.savedAt > PURGE_AFTER_MS) {
      delete sharedBirthdays[code];
      changed = true;
      console.log(`[Auto-Purge] Code #${code} was automatically purged after 30 days. It is now free for new users to register.`);
    }
  }
  if (changed) {
    persistStorage();
  }
  return changed;
}
async function startServer() {
  initStorage();
  setInterval(() => {
    purgeExpiredCodes();
  }, 60 * 60 * 1e3);
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "30mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "30mb" }));
  app.get("/api/birthdays/check/:code", (req, res) => {
    purgeExpiredCodes();
    const code = req.params.code?.trim();
    const cardId = req.query.cardId?.trim();
    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: "Invalid 6-digit code format" });
    }
    const existing = sharedBirthdays[code];
    if (!existing) {
      return res.json({ success: true, available: true, code });
    }
    if (cardId && existing.data && existing.data.id === cardId) {
      return res.json({ success: true, available: true, isOwner: true, code });
    }
    const ageMs = Date.now() - existing.savedAt;
    const daysLeftForPurge = Math.max(1, Math.ceil((PURGE_AFTER_MS - ageMs) / (24 * 60 * 60 * 1e3)));
    return res.json({
      success: true,
      available: false,
      code,
      message: `\u092F\u094B \u0915\u094B\u0921 #${code} \u092A\u0939\u093F\u0932\u0947 \u0928\u0948 \u0905\u0930\u094D\u0915\u094B \u092F\u0941\u091C\u0930\u0932\u0947 \u092A\u094D\u0930\u092F\u094B\u0917 \u0917\u0930\u093F\u0930\u0939\u0928\u0941\u092D\u090F\u0915\u094B \u091B\u0964 \u0915\u0943\u092A\u092F\u093E \u0905\u0930\u094D\u0915\u094B \u0928\u092F\u093E\u0901 \u0915\u094B\u0921 \u0930\u093E\u0916\u094D\u0928\u0941\u0939\u094B\u0938\u094D!`,
      daysLeftForPurge
    });
  });
  app.post("/api/birthdays/save", (req, res) => {
    try {
      purgeExpiredCodes();
      let { code, data } = req.body;
      if (!data) {
        return res.status(400).json({ success: false, error: "Missing birthday data" });
      }
      if (!code || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
        code = Math.floor(1e5 + Math.random() * 9e5).toString();
      } else {
        code = code.trim();
      }
      const existing = sharedBirthdays[code];
      if (existing && existing.data) {
        const existingCardId = existing.data.id;
        const incomingCardId = data.id;
        if (existingCardId && incomingCardId && existingCardId !== incomingCardId) {
          const ageMs = Date.now() - existing.savedAt;
          const daysUntilPurge = Math.max(1, Math.ceil((PURGE_AFTER_MS - ageMs) / (24 * 60 * 60 * 1e3)));
          return res.status(409).json({
            success: false,
            codeConflict: true,
            code,
            daysUntilPurge,
            error: `\u092F\u094B \u0915\u094B\u0921 #${code} \u092A\u0939\u093F\u0932\u0947 \u0928\u0948 \u0905\u0930\u094D\u0915\u094B \u092F\u0941\u091C\u0930\u0932\u0947 \u092A\u094D\u0930\u092F\u094B\u0917 \u0917\u0930\u093F\u0930\u0939\u0928\u0941\u092D\u090F\u0915\u094B \u091B\u0964 \u0915\u0943\u092A\u092F\u093E New Code \u0925\u093F\u091A\u0947\u0930 \u0928\u092F\u093E\u0901 \u0915\u094B\u0921 \u0930\u093E\u0916\u094D\u0928\u0941\u0939\u094B\u0938\u094D! (${daysUntilPurge} \u0926\u093F\u0928\u092A\u091B\u093F \u092F\u094B \u0915\u094B\u0921 \u0938\u094D\u0935\u0924: \u0916\u0941\u0932\u093E \u0939\u0941\u0928\u0947\u091B)`
          });
        }
      }
      if (!data.id) {
        data.id = `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      }
      data.code = code;
      data.updatedAt = Date.now();
      sharedBirthdays[code] = {
        code,
        data,
        savedAt: Date.now()
      };
      persistStorage();
      console.log(`Saved birthday for "${data.name}" with 6-digit code: ${code} (CardId: ${data.id})`);
      return res.json({
        success: true,
        code,
        cardId: data.id,
        savedAt: sharedBirthdays[code].savedAt,
        message: `Birthday saved successfully with unique 6-digit code: ${code}`
      });
    } catch (err) {
      console.error("Error saving shared birthday:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to save" });
    }
  });
  app.get("/api/birthdays/:code", (req, res) => {
    try {
      purgeExpiredCodes();
      const code = req.params.code?.trim();
      if (!code || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ success: false, error: "Invalid 6-digit code format" });
      }
      const item = sharedBirthdays[code];
      if (!item || !item.data) {
        return res.status(404).json({
          success: false,
          notFound: true,
          error: `\u092F\u094B \u0915\u094B\u0921 #${code} \u0938\u0901\u0917 \u0915\u0941\u0928\u0948 Birthday Card \u092D\u0947\u091F\u093F\u090F\u0928 \u0935\u093E \u0969\u0966 \u0926\u093F\u0928 \u0915\u091F\u0947\u0930 \u0939\u091F\u093F\u0938\u0915\u0947\u0915\u094B \u091B\u0964 \u0915\u094B\u0921 \u091C\u093E\u0901\u091A\u094D\u0928\u0941\u0939\u094B\u0938\u094D\u0964`
        });
      }
      const ageMs = Date.now() - item.savedAt;
      if (ageMs > PLAY_VALIDITY_MS) {
        const daysUntilFree = Math.max(1, Math.ceil((PURGE_AFTER_MS - ageMs) / (24 * 60 * 60 * 1e3)));
        return res.status(410).json({
          success: false,
          expired: true,
          code,
          savedAt: item.savedAt,
          daysUntilFree,
          error: `\u092F\u094B \u0915\u094B\u0921 (#${code}) \u0915\u094B \u092E\u094D\u092F\u093E\u0926 (\u096D \u0926\u093F\u0928) \u0938\u092E\u093E\u092A\u094D\u0924 \u092D\u0907\u0938\u0915\u0947\u0915\u094B \u091B! \u0969\u0966 \u0926\u093F\u0928 \u092A\u0941\u0917\u0947\u092A\u091B\u093F (\u092C\u093E\u0901\u0915\u0940 ${daysUntilFree} \u0926\u093F\u0928\u092E\u093E) \u092F\u094B \u0915\u094B\u0921 \u0938\u094D\u0935\u0924: \u0939\u091F\u0947\u0930 \u092A\u0941\u0928\u0903 \u0928\u092F\u093E\u0901 \u092C\u0928\u093E\u0909\u0928 \u092E\u093F\u0932\u094D\u0928\u0947\u091B\u0964`
        });
      }
      const daysLeft = Math.ceil((PLAY_VALIDITY_MS - ageMs) / (24 * 60 * 60 * 1e3));
      return res.json({
        success: true,
        code,
        data: item.data,
        savedAt: item.savedAt,
        validDaysLeft: daysLeft
      });
    } catch (err) {
      console.error("Error fetching birthday by code:", err);
      return res.status(500).json({ success: false, error: "Server error fetching code" });
    }
  });
  app.get("/api/birthdays", (req, res) => {
    const list = Object.values(sharedBirthdays).map((item) => ({
      code: item.code,
      name: item.data?.name || "Friend",
      age: item.data?.age || "",
      savedAt: item.savedAt
    }));
    return res.json({ success: true, birthdays: list });
  });
  app.post("/api/generate-wishes", async (req, res) => {
    try {
      const { name, age, bio } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          wishes: [
            `\u091C\u0928\u094D\u092E\u0926\u093F\u0928\u0915\u094B \u0927\u0947\u0930\u0948 \u0927\u0947\u0930\u0948 \u0936\u0941\u092D\u0915\u093E\u092E\u0928\u093E ${name || "Dear"}! \u0924\u092A\u093E\u0908\u0902\u0915\u094B \u091C\u0940\u0935\u0928 \u0938\u0927\u0948\u0902 \u0916\u0941\u0936\u0940, \u0938\u092B\u0932\u0924\u093E \u0930 \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F\u0932\u0947 \u092D\u0930\u093F\u092F\u094B\u0938\u094D\u0964 \u{1F382}\u{1F389}`,
            `May this special Chapter ${age || "12"} open brilliant new doors to incredible opportunities, joy, and wonderful adventures!`,
            `Here\u2019s to another 365 days of laughter, great memories, and achieving all your dreams. Keep shining bright! \u2728`,
            `${bio ? `Inspiration: ${bio}` : "Keep inspiring everyone around you with your wonderful smile, kindness, and boundless energy! \u{1F496}"}`
          ]
        });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const prompt = `You are a warm, creative birthday greeting card writer. Generate exactly 4 distinct, heartwarming birthday wishes/messages for ${name || "our friend"} (Age ${age || "12"}).
Person's bio / personal details: "${bio || "An amazing soul who brings boundless joy and inspiration."}"

Requirements:
- Provide exactly 4 distinct birthday wishes (one for each of the 4 card pages / book pages).
- Mix warm Nepali (with English translation or heartfelt Nepali wishes) and inspiring English wishes.
- Keep each wish concise, beautiful, and emotionally touching.
- Return ONLY a valid JSON array of 4 strings, e.g. ["Wish 1", "Wish 2", "Wish 3", "Wish 4"]. No markdown formatting or extra text.`;
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });
      const text = response.text || "";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsedWishes;
      try {
        parsedWishes = JSON.parse(cleaned);
      } catch (e) {
        parsedWishes = cleaned.split("\n").filter(Boolean).slice(0, 4);
      }
      if (!Array.isArray(parsedWishes) || parsedWishes.length < 4) {
        throw new Error("Invalid AI response format");
      }
      res.json({ wishes: parsedWishes.slice(0, 4) });
    } catch (err) {
      console.error("Gemini AI generation error:", err);
      res.json({
        wishes: [
          `\u091C\u0928\u094D\u092E\u0926\u093F\u0928\u0915\u094B \u0927\u0947\u0930\u0948 \u0927\u0947\u0930\u0948 \u0936\u0941\u092D\u0915\u093E\u092E\u0928\u093E! \u0938\u0926\u093E \u0916\u0941\u0936\u0940 \u0930 \u0938\u094D\u0935\u0938\u094D\u0925 \u0930\u0939\u0928\u0941\u0939\u094B\u0938\u094D\u0964 (Happy Birthday! Wishing you endless health and happiness!)`,
          `May this special year bring immense success, adventure, and joy to your life!`,
          `Here\u2019s to another 365 days of laughter, great memories, and pure happiness.`,
          `Keep shining brightly and inspiring everyone with your warm smile and kind heart!`
        ]
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
