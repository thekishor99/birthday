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
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var import_vite = require("vite");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  if (req.url.startsWith("/farewelltrip/api")) {
    req.url = req.url.replace(/^\/farewelltrip/, "");
  }
  next();
});
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
var UPLOADS_DIR = import_path.default.join(process.cwd(), "public", "uploads");
if (!import_fs.default.existsSync(UPLOADS_DIR)) {
  import_fs.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use("/uploads", import_express.default.static(UPLOADS_DIR));
function processAndStoreBase64Media(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    return dataUrl;
  }
  try {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return dataUrl;
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    let ext = "bin";
    if (mimeType.includes("audio/mpeg") || mimeType.includes("audio/mp3")) ext = "mp3";
    else if (mimeType.includes("audio/wav")) ext = "wav";
    else if (mimeType.includes("audio/ogg")) ext = "ogg";
    else if (mimeType.includes("audio/m4a") || mimeType.includes("audio/aac")) ext = "m4a";
    else if (mimeType.includes("image/jpeg") || mimeType.includes("image/jpg")) ext = "jpg";
    else if (mimeType.includes("image/png")) ext = "png";
    else if (mimeType.includes("image/webp")) ext = "webp";
    else if (mimeType.includes("image/gif")) ext = "gif";
    const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = import_path.default.join(UPLOADS_DIR, fileName);
    import_fs.default.writeFileSync(filePath, buffer);
    return `/uploads/${fileName}`;
  } catch (err) {
    console.error("Error saving base64 media to disk:", err);
    return dataUrl;
  }
}
var JWT_SECRET = process.env.JWT_SECRET || "super-secret-farewell-trip-planning-key-2026";
var INITIAL_ADMIN_EMAIL = "kjoshi2064@gmail.com";
var INITIAL_ADMIN_SEED_PASSWORD = "kishor99farewell";
var configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
if (!import_fs.default.existsSync(configPath)) {
  console.error("Critical Error: firebase-applet-config.json is missing. Please make sure set_up_firebase was completed.");
  process.exit(1);
}
var firebaseConfig = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
var firebaseApp = (0, import_app.initializeApp)(firebaseConfig);
var db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)" ? (0, import_firestore.getFirestore)(firebaseApp, firebaseConfig.firestoreDatabaseId) : firebaseConfig.databaseId && firebaseConfig.databaseId !== "(default)" ? (0, import_firestore.getFirestore)(firebaseApp, firebaseConfig.databaseId) : (0, import_firestore.getFirestore)(firebaseApp);
async function ensureFirebaseAuthUser() {
  if (!firebaseConfig.apiKey) return;
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: INITIAL_ADMIN_EMAIL,
        password: INITIAL_ADMIN_SEED_PASSWORD,
        returnSecureToken: true
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`[Firebase Auth] Successfully registered admin in Firebase Authentication: ${INITIAL_ADMIN_EMAIL}`);
    } else if (data.error?.message?.includes("EMAIL_EXISTS")) {
      console.log(`[Firebase Auth] Admin already registered in Firebase Authentication: ${INITIAL_ADMIN_EMAIL}`);
    } else {
      console.log(`[Firebase Auth] Notice on Firebase Auth signup:`, data?.error?.message || data);
    }
  } catch (err) {
    console.error("[Firebase Auth] Error registering admin in Firebase Auth:", err);
  }
}
async function ensureInitialAdminUser() {
  try {
    const adminDocRef = (0, import_firestore.doc)(db, "admin_users", INITIAL_ADMIN_EMAIL);
    const adminSnap = await (0, import_firestore.getDoc)(adminDocRef);
    if (!adminSnap.exists()) {
      const usersCol = (0, import_firestore.collection)(db, "admin_users");
      const q = (0, import_firestore.query)(usersCol, (0, import_firestore.where)("email", "==", INITIAL_ADMIN_EMAIL));
      const existingByEmail = await (0, import_firestore.getDocs)(q);
      if (existingByEmail.empty) {
        const passwordHash = import_bcryptjs.default.hashSync(INITIAL_ADMIN_SEED_PASSWORD, 10);
        const newAdminDoc = {
          email: INITIAL_ADMIN_EMAIL,
          passwordHash,
          role: "admin",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await (0, import_firestore.setDoc)(adminDocRef, newAdminDoc);
        console.log(`[Auth] Initial admin account created in Firestore admin_users collection for: ${INITIAL_ADMIN_EMAIL}`);
      }
    }
    await ensureFirebaseAuthUser();
  } catch (err) {
    console.error("[Auth] Error verifying/creating initial admin in Firestore:", err);
  }
}
async function findAdminUser(identifier) {
  const clean = identifier.trim().toLowerCase();
  try {
    const directRef = (0, import_firestore.doc)(db, "admin_users", clean);
    const directSnap = await (0, import_firestore.getDoc)(directRef);
    if (directSnap.exists()) {
      return { id: directSnap.id, ...directSnap.data() };
    }
    const usersCol = (0, import_firestore.collection)(db, "admin_users");
    const q = (0, import_firestore.query)(usersCol, (0, import_firestore.where)("email", "==", clean));
    const snap = await (0, import_firestore.getDocs)(q);
    if (!snap.empty) {
      const firstDoc = snap.docs[0];
      return { id: firstDoc.id, ...firstDoc.data() };
    }
    if (clean === "admin") {
      const defaultAdminRef = (0, import_firestore.doc)(db, "admin_users", INITIAL_ADMIN_EMAIL);
      const defaultSnap = await (0, import_firestore.getDoc)(defaultAdminRef);
      if (defaultSnap.exists()) {
        return { id: defaultSnap.id, ...defaultSnap.data() };
      }
    }
  } catch (err) {
    console.error("[Auth] Error querying admin user from Firestore:", err);
  }
  return null;
}
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }
  import_jsonwebtoken.default.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}
app.post("/api/responses", async (req, res) => {
  try {
    const { name, joining_status, location, description, preferred_date } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters long." });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: "Name cannot exceed 100 characters." });
    }
    if (!joining_status || joining_status !== "Yes" && joining_status !== "No") {
      return res.status(400).json({ error: "Please select whether you are joining or not." });
    }
    if (!location || typeof location !== "string" || location.trim().length === 0) {
      return res.status(400).json({ error: "Please suggest or select a preferred location." });
    }
    if (location.length > 100) {
      return res.status(400).json({ error: "Location cannot exceed 100 characters." });
    }
    if (preferred_date && (typeof preferred_date !== "string" || preferred_date.length > 100)) {
      return res.status(400).json({ error: "Preferred date text cannot exceed 100 characters." });
    }
    if (description && (typeof description !== "string" || description.length > 1e3)) {
      return res.status(400).json({ error: "Message/Description cannot exceed 1000 characters." });
    }
    const sanitizedResponse = {
      name: name.trim(),
      joining_status,
      location: location.trim(),
      preferred_date: preferred_date && typeof preferred_date === "string" ? preferred_date.trim() : "",
      description: description ? description.trim() : "",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const docRef = await (0, import_firestore.addDoc)((0, import_firestore.collection)(db, "responses"), sanitizedResponse);
    return res.status(201).json({
      success: true,
      message: "Response submitted successfully \u2764\uFE0F",
      id: docRef.id
    });
  } catch (error) {
    console.error("Error submitting response: ", error);
    return res.status(500).json({ error: "Failed to submit response. Please try again." });
  }
});
app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Username/Email and Password are required." });
    }
    await ensureInitialAdminUser();
    const adminUser = await findAdminUser(username);
    if (!adminUser) {
      return res.status(401).json({ error: "Invalid username or password. Please check your credentials." });
    }
    const storedHash = adminUser.passwordHash || adminUser.password_hash;
    if (!storedHash || typeof storedHash !== "string") {
      return res.status(401).json({ error: "Invalid admin account configuration in database." });
    }
    const isPasswordValid = import_bcryptjs.default.compareSync(password.trim(), storedHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password. Please check your credentials." });
    }
    const token = import_jsonwebtoken.default.sign(
      {
        email: adminUser.email,
        username: adminUser.email,
        role: adminUser.role || "admin"
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    return res.status(200).json({
      success: true,
      token,
      username: adminUser.email
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({ error: "Login process failed. Please try again." });
  }
});
app.post("/api/admin/change-password", authenticateToken, async (req, res) => {
  try {
    const { newUsername, newPassword, currentPassword } = req.body || {};
    if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }
    const currentEmail = req.user?.email || req.user?.username || INITIAL_ADMIN_EMAIL;
    const adminUser = await findAdminUser(currentEmail);
    if (!adminUser) {
      return res.status(404).json({ error: "Admin user not found in database." });
    }
    if (currentPassword) {
      const storedHash = adminUser.passwordHash || adminUser.password_hash;
      if (!import_bcryptjs.default.compareSync(currentPassword.trim(), storedHash)) {
        return res.status(401).json({ error: "Current password does not match." });
      }
    }
    const updatedEmail = newUsername && typeof newUsername === "string" && newUsername.trim() ? newUsername.trim().toLowerCase() : adminUser.email;
    const updatedHash = import_bcryptjs.default.hashSync(newPassword.trim(), 10);
    const targetDocId = adminUser.id || adminUser.email || INITIAL_ADMIN_EMAIL;
    const userDocRef = (0, import_firestore.doc)(db, "admin_users", targetDocId);
    const updatedData = {
      email: updatedEmail,
      passwordHash: updatedHash,
      role: "admin",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await (0, import_firestore.setDoc)(userDocRef, updatedData, { merge: true });
    return res.json({
      success: true,
      message: "Admin credentials updated and saved permanently in Firestore admin_users! \u2764\uFE0F",
      username: updatedEmail
    });
  } catch (error) {
    console.error("Error updating admin credentials:", error);
    return res.status(500).json({ error: "Failed to update admin credentials." });
  }
});
app.get("/api/admin/responses", authenticateToken, async (req, res) => {
  try {
    const responsesCol = (0, import_firestore.collection)(db, "responses");
    const q = (0, import_firestore.query)(responsesCol);
    const querySnapshot = await (0, import_firestore.getDocs)(q);
    const responses = [];
    querySnapshot.forEach((doc2) => {
      const data = doc2.data();
      responses.push({
        id: doc2.id,
        ...data
      });
    });
    responses.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
    return res.json({ responses });
  } catch (error) {
    console.error("Error fetching responses: ", error);
    return res.status(500).json({ error: "Failed to fetch responses from database." });
  }
});
app.delete("/api/admin/responses/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const responseRef = (0, import_firestore.doc)(db, "responses", id);
    const responseSnap = await (0, import_firestore.getDoc)(responseRef);
    if (!responseSnap.exists()) {
      return res.status(404).json({ error: "Response not found." });
    }
    await (0, import_firestore.deleteDoc)(responseRef);
    return res.json({ success: true, message: "Response deleted successfully." });
  } catch (error) {
    console.error("Error deleting response: ", error);
    return res.status(500).json({ error: "Failed to delete response." });
  }
});
app.get("/api/admin/stats", authenticateToken, async (req, res) => {
  try {
    const responsesCol = (0, import_firestore.collection)(db, "responses");
    const querySnapshot = await (0, import_firestore.getDocs)(responsesCol);
    let total = 0;
    let going = 0;
    let notGoing = 0;
    const locationVotes = {};
    querySnapshot.forEach((doc2) => {
      const data = doc2.data();
      total++;
      if (data.joining_status === "Yes") {
        going++;
      } else if (data.joining_status === "No") {
        notGoing++;
      }
      const loc = data.location ? data.location.trim() : "";
      if (loc) {
        const key = loc;
        locationVotes[key] = (locationVotes[key] || 0) + 1;
      }
    });
    const popularLocations = Object.entries(locationVotes).map(([name, votes]) => ({ name, votes })).sort((a, b) => b.votes - a.votes);
    return res.json({
      totalResponses: total,
      going,
      notGoing,
      locationsCount: Object.keys(locationVotes).length,
      popularLocations
    });
  } catch (error) {
    console.error("Error fetching stats: ", error);
    return res.status(500).json({ error: "Failed to compute stats." });
  }
});
var DEFAULT_SETTINGS = {
  website_name: "Farewell Trip",
  header_subtitle: "Planning & RSVPs",
  hero_badge: "Exciting School Farewell Trip",
  hero_title: "Farewell Trip Planning",
  hero_subtitle: "\u201CFarewell \u092A\u091B\u093F \u0939\u093E\u092E\u0940 \u0938\u092C\u0948 \u092E\u093F\u0932\u0947\u0930 \u0915\u0939\u093E\u0901 \u0930 \u0915\u0939\u093F\u0932\u0947 \u0918\u0941\u092E\u094D\u0928 \u091C\u093E\u0928\u0947?\u201D",
  hero_description: "Our school farewell is just around the corner! Please take a quick moment to let us know if you're joining, suggest your favorite destination, and write a small message or suggestion.",
  form_title: "Participation Form",
  name_label: "Full Name",
  name_placeholder: "Enter your name",
  joining_question: "Will you join the trip?",
  going_text: "Yes, I will join",
  not_going_text: "No, I won't join",
  location_label: "Preferred Location",
  location_placeholder: "-- Select a preferred location --",
  date_label: "Preferred Trip Date / Date Range",
  date_placeholder: "e.g. 2083 Ashoj 1 to Ashoj 15",
  description_label: "Description / Suggestion",
  description_placeholder: "Write your suggestion or message... (e.g. Jhilmila \u091C\u093E\u0901\u0926\u093E \u0930\u093E\u092E\u094D\u0930\u094B \u0939\u0941\u0928\u094D\u091B \u091C\u0938\u094D\u0924\u094B \u0932\u093E\u0917\u094D\u091B\u0964)",
  submit_button_text: "Submit Response",
  success_message: "Response submitted successfully \u2764\uFE0F",
  footer_text: "\xA9 2026 School Farewell Group. All rights reserved.",
  group_photo_url: "",
  group_photos: [],
  background_song_url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
  background_song_title: "Farewell Memory Instrumental",
  locations: ["Jhilmila", "Dodhara Chandani", "Bedkot", "Mahendranagar"],
  updated_at: (/* @__PURE__ */ new Date()).toISOString()
};
app.get("/api/settings", async (req, res) => {
  try {
    const docRef = (0, import_firestore.doc)(db, "site_settings", "current");
    const docSnap = await (0, import_firestore.getDoc)(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      let needsCleanup = false;
      if (data.background_song_url && data.background_song_url.startsWith("data:")) {
        data.background_song_url = processAndStoreBase64Media(data.background_song_url);
        needsCleanup = true;
      }
      if (data.group_photo_url && data.group_photo_url.startsWith("data:")) {
        data.group_photo_url = processAndStoreBase64Media(data.group_photo_url);
        needsCleanup = true;
      }
      if (Array.isArray(data.group_photos)) {
        data.group_photos = data.group_photos.map((item) => {
          if (item && item.startsWith("data:")) {
            needsCleanup = true;
            return processAndStoreBase64Media(item);
          }
          return item;
        });
      }
      if (needsCleanup) {
        (0, import_firestore.setDoc)(docRef, data).catch((err) => console.error("Error writing sanitized settings back to Firestore:", err));
      }
      return res.json({ id: "current", ...DEFAULT_SETTINGS, ...data });
    } else {
      return res.json({ id: "current", ...DEFAULT_SETTINGS });
    }
  } catch (error) {
    console.error("Error fetching site settings: ", error);
    return res.status(500).json({ error: "Failed to fetch site settings." });
  }
});
app.post("/api/admin/settings", authenticateToken, async (req, res) => {
  try {
    const settingsData = { ...req.body || {} };
    if (settingsData.background_song_url) {
      settingsData.background_song_url = processAndStoreBase64Media(settingsData.background_song_url);
    }
    if (settingsData.group_photo_url) {
      settingsData.group_photo_url = processAndStoreBase64Media(settingsData.group_photo_url);
    }
    if (Array.isArray(settingsData.group_photos)) {
      settingsData.group_photos = settingsData.group_photos.map(
        (item) => processAndStoreBase64Media(item)
      );
    }
    const docRef = (0, import_firestore.doc)(db, "site_settings", "current");
    const updatedData = {
      ...settingsData,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    await (0, import_firestore.setDoc)(docRef, updatedData);
    return res.json({ success: true, settings: updatedData });
  } catch (error) {
    console.error("Error updating site settings: ", error);
    return res.status(500).json({ error: "Failed to update site settings." });
  }
});
app.get("/api/firebase-config", (req, res) => {
  try {
    const configPath2 = import_path.default.join(process.cwd(), "firebase-applet-config.json");
    if (!import_fs.default.existsSync(configPath2)) {
      return res.status(404).json({ error: "Config missing" });
    }
    const config = JSON.parse(import_fs.default.readFileSync(configPath2, "utf-8"));
    return res.json({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
      databaseId: config.firestoreDatabaseId || ""
    });
  } catch (error) {
    console.error("Error loading client firebase config: ", error);
    return res.status(500).json({ error: "Failed to load config." });
  }
});
async function startServer() {
  await ensureInitialAdminUser().catch((err) => {
    console.error("[Auth] Background startup admin user check error:", err);
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
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "127.0.0.1", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
