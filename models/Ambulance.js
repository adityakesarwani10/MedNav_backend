const mongoose = require("mongoose");

const ambulanceSchema = new mongoose.Schema({
  ambulanceId: { type: String, unique: true, default: () => `AMB-${Date.now()}` },
  plate:       { type: String, required: true, unique: true },
  driver:      { type: String, required: true },
  phone:       { type: String, default: "+91XXXXXXXXXX" },
  available:   { type: Boolean, default: true },
  status:      { type: String, enum: ["available", "on_trip", "maintenance"], default: "available" },
  hospital:    { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Ambulance", ambulanceSchema);

