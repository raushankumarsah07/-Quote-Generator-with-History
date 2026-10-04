require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const QUOTE_API = "https://dummyjson.com/quotes/random";

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ---------- Fallback data (used when the public API fails) ---------- */
// Accepts different key names so a downloaded fallback file also works: text/quote/content, author/a
const normalize = (q) => ({
  text: String(q.text || q.quote || q.content || q.q || "").trim(),
  author: String(q.author || q.a || "Unknown").trim() || "Unknown",
});
let fallback = [];
try {
  const raw = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "data", "fallback-quotes.json"),
      "utf8",
    ),
  );
  fallback = (Array.isArray(raw) ? raw : raw.quotes || [])
    .map(normalize)
    .filter((q) => q.text);
} catch (e) {
  console.warn("Could not load fallback quotes:", e.message);
}

/* ---------- Database model ---------- */
const favoriteSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 1000 },
  author: { type: String, default: "Unknown", maxlength: 100 },
  savedAt: { type: Date, default: Date.now },
});
favoriteSchema.index({ text: 1, author: 1 }, { unique: true }); // prevents duplicates
const Favorite = mongoose.model("Favorite", favoriteSchema);

/* ---------- Routes ---------- */
// 1. Fetch a random quote from the public API, fall back to local data on any failure
app.get("/api/quote", async (req, res) => {
  try {
    const r = await fetch(QUOTE_API, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error("API responded " + r.status);
    const q = normalize(await r.json());
    if (!q.text) throw new Error("Unexpected API format");
    return res.json({ ...q, source: "api" });
  } catch (err) {
    console.warn("Quote API failed, using fallback:", err.message);
    if (!fallback.length)
      return res.status(503).json({ error: "No quotes available right now." });
    const q = fallback[Math.floor(Math.random() * fallback.length)];
    res.json({ ...q, source: "fallback" });
  }
});

// 2. List favorites (optional ?search= filter on text or author)
app.get("/api/favorites", async (req, res) => {
  try {
    const filter = {};
    const s = (req.query.search || "").trim();
    if (s) {
      const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ text: rx }, { author: rx }];
    }
    res.json(await Favorite.find(filter).sort({ savedAt: -1 }).lean());
  } catch (err) {
    res.status(500).json({ error: "Could not load favorites." });
  }
});

// 3. Save a favorite
app.post("/api/favorites", async (req, res) => {
  const q = normalize(req.body || {});
  if (!q.text)
    return res.status(400).json({ error: "Quote text is required." });
  try {
    res.status(201).json(await Favorite.create(q));
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ error: "Already in your favorites." });
    res.status(500).json({ error: "Could not save the quote." });
  }
});

// 4. Delete a favorite
app.delete("/api/favorites/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ error: "Invalid id." });
  try {
    await Favorite.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Could not delete." });
  }
});

/* ---------- Start ---------- */
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
