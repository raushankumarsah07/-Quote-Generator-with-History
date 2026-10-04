require("dotenv").config();
const mongoose = require("mongoose");
const data = require("./data/quote_history_seed.json");

const Favorite = mongoose.model(
  "Favorite",
  new mongoose.Schema({
    text: String,
    author: String,
    savedAt: Date,
  }),
);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await Favorite.deleteMany({
    $or: data.map(({ text, author }) => ({ text, author })),
  });
  console.log("Removed", result.deletedCount, "seeded favorites");
  process.exit(0);
})();
