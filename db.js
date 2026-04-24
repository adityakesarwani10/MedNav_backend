require("dotenv").config();
const mongoose = require("mongoose");

const User       = require("./models/User");
const Call       = require("./models/Call");
const Ambulance  = require("./models/Ambulance");
const Hospital   = require("./models/Hospital");
const Otp        = require("./models/Otp");
const Session    = require("./models/Session");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mednav";

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB Connected successfully");
    await seedData();
    console.log("🌱 Seed data checked/inserted");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
}

// Keep in-memory otpStore for fast OTP verification (can also use DB directly)
const otpStore = {};
const sessions = {}; // fallback in-memory (deprecated, using Session model)

async function seedData() {
  // Seed default users
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.create([
      {
        userId: "USR-001",
        name: "Demo User",
        phone: "+919876543210",
        role: "user",
        verified: true,
        createdAt: new Date("2024-01-01"),
      },
      {
        userId: "ADM-001",
        name: "Admin",
        phone: "+919140040247",
        role: "admin",
        verified: true,
        createdAt: new Date("2024-01-01"),
      },
    ]);
    console.log("👤 Default users seeded");
  }

  // Seed ambulances
  const ambCount = await Ambulance.countDocuments();
  if (ambCount === 0) {
    await Ambulance.create([
      { ambulanceId: "AMB-01", plate: "MH-01-AB-1234", driver: "Rajan Singh",  phone: "+91XXXXXXXXXX", available: true,  status: "available",   hospital: "City General Hospital" },
      { ambulanceId: "AMB-02", plate: "DL-02-CD-5678", driver: "Amit Singh",   phone: "+91XXXXXXXXXX", available: false, status: "on_trip",     hospital: "Apollo Medical Center" },
      { ambulanceId: "AMB-03", plate: "KA-03-EF-9012", driver: "Suresh Patil", phone: "+91XXXXXXXXXX", available: true,  status: "available",   hospital: "City General Hospital" },
      { ambulanceId: "AMB-04", plate: "MH-04-GH-3456", driver: "Vikram Joshi", phone: "+91XXXXXXXXXX", available: false, status: "maintenance", hospital: "Ram Manohar Lohia" },
      { ambulanceId: "AMB-05", plate: "TN-05-IJ-7890", driver: "Karthik Rajan",phone: "+91XXXXXXXXXX", available: false, status: "on_trip",     hospital: "Apollo Medical Center" },
    ]);
    console.log("🚑 Default ambulances seeded");
  }

  // Seed hospitals
  const hospCount = await Hospital.countDocuments();
  if (hospCount === 0) {
    await Hospital.create([
      { hospitalId: "HOSP-01", name: "City General Hospital", erBeds: 8,  totalBeds: 20, available: true,  address: "Civil Lines, Prayagraj",   phone: "+91XXXXXXXXXX" },
      { hospitalId: "HOSP-02", name: "Apollo Medical Center", erBeds: 3,  totalBeds: 15, available: true,  address: "Naini, Prayagraj",          phone: "+91XXXXXXXXXX" },
      { hospitalId: "HOSP-03", name: "Ram Manohar Lohia",     erBeds: 12, totalBeds: 40, available: true,  address: "George Town, Prayagraj",   phone: "+91XXXXXXXXXX" },
      { hospitalId: "HOSP-04", name: "Green Valley Hospital", erBeds: 0,  totalBeds: 10, available: false, address: "Lukerganj, Prayagraj",     phone: "+91XXXXXXXXXX" },
    ]);
    console.log("🏥 Default hospitals seeded");
  }
}

module.exports = { connectDB, User, Call, Ambulance, Hospital, Otp, Session, otpStore, sessions };

