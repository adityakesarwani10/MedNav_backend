const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phone:     { type: String, required: true },
  otp:       { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

// Auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Otp", otpSchema);

