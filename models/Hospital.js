const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema({
  hospitalId:  { type: String, unique: true, default: () => `HOSP-${Date.now()}` },
  name:        { type: String, required: true, unique: true },
  erBeds:      { type: Number, default: 0 },
  totalBeds:   { type: Number, default: 0 },
  available:   { type: Boolean, default: true },
  address:     { type: String, required: true },
  phone:       { type: String, default: "+91XXXXXXXXXX" },
}, { timestamps: true });

module.exports = mongoose.model("Hospital", hospitalSchema);

