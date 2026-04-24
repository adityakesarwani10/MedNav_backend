const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true },
  userId:    { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: "7d" }, // auto-delete after 7 days
});

module.exports = mongoose.model("Session", sessionSchema);

