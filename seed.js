require("dotenv").config();
const mongoose = require("mongoose");
const data = require("./data/quote_history_seed.json");

const Favorite = mongoose.model(
  "Favorite",
  new mongoose.Schema({
    text: String,
    author: String,
    savedAt: { type: Date, default: Date.now },
  }),
);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Favorite.insertMany(
    data.map(({ text, author }) => ({ text, author })),
    { ordered: false },
  ).catch(() => {}); // ignore duplicates
  console.log("Seeded", await Favorite.countDocuments(), "favorites");
  process.exit(0);
})();
