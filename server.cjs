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
var import_vite = require("vite");
var import_genai = require("@google/genai");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
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
