const mongoose = require("mongoose");

const callSchema = new mongoose.Schema({
  callId:      { type: String, unique: true, default: () => `CALL-${Date.now()}` },
  userId:      { type: String },
  condition:   { type: String },
  specialist:  { type: String },
  priority:    { type: String, enum: ["emergency", "high", "medium", "low"] },
  requirements:{ type: String },
  caller:      { type: String },
  status:      { type: String, enum: ["active", "completed", "cancelled"], default: "active" },
  ambulance:   { type: String },
  hospital:    { type: String },
  timestamp:   { type: String, default: () => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) },
  trackingData:{ type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model("Call", callSchema);

