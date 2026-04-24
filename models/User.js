const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId:    { type: String, unique: true, default: () => `USR-${Date.now()}` },
  name:      { type: String, default: "New User" },
  phone:     { type: String, required: true, unique: true },
  role:      { type: String, enum: ["user", "admin"], default: "user" },
  verified:  { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);

