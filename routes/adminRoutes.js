const express  = require("express");
const router   = express.Router();
const { authenticate, adminOnly } = require("../middleware");
const { User, Ambulance, Hospital, Call } = require("../db");
const { state } = require("../state");

// All admin routes require auth + admin role
router.use(authenticate, adminOnly);

// ── GET /api/admin/overview ───────────────────────────────────────
// Feeds: Admin dashboard summary stats
router.get("/overview", async (req, res) => {
  const totalUsers = await User.countDocuments({ role: "user" });
  const totalCalls = await Call.countDocuments();
  const emergencyCalls = await Call.countDocuments({ priority: "emergency" });
  const availableAmbs = await Ambulance.countDocuments({ available: true });
  const totalAmbs = await Ambulance.countDocuments();
  const availableHospitals = await Hospital.countDocuments({ available: true });

  res.json({
    stats: {
      totalUsers,
      totalCalls,
      emergencyCalls,
      availableAmbs,
      totalAmbs,
      availableHospitals,
    },
    recentActivity: state.activity,
    systemStatus:   state.status,
  });
});

// ── GET /api/admin/users ──────────────────────────────────────────
// Feeds: Admin user list
router.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users.map(u => ({
    id:        u.userId,
    name:      u.name,
    phone:     u.phone,
    role:      u.role,
    verified:  u.verified,
    createdAt: u.createdAt,
  })));
});

// ── PUT /api/admin/users/:id ──────────────────────────────────────
// Change user role or name from admin panel
router.put("/users/:id", async (req, res) => {
  const user = await User.findOne({ userId: req.params.id });
  if (!user) return res.status(404).json({ message: "User not found" });

  const { name, role } = req.body;
  if (name) user.name = name;
  if (role && ["user","admin"].includes(role)) user.role = role;
  await user.save();

  res.json({ success: true, user });
});

// ── GET /api/admin/fleet ──────────────────────────────────────────
// Admin sees full ambulance details including phone numbers
router.get("/fleet", async (req, res) => {
  const ambulances = await Ambulance.find();
  res.json(ambulances.map(a => ({
    id:        a.ambulanceId,
    plate:     a.plate,
    driver:    a.driver,
    phone:     a.phone,
    available: a.available,
    status:    a.status,
    hospital:  a.hospital,
  })));
});

// ── PUT /api/admin/ambulance/:id ──────────────────────────────────
// Admin changes ambulance status
router.put("/ambulance/:id", async (req, res) => {
  const amb = await Ambulance.findOne({ ambulanceId: req.params.id });
  if (!amb) return res.status(404).json({ message: "Ambulance not found" });

  const { status, driver, phone } = req.body;

  if (status) {
    amb.status    = status;
    amb.available = status === "available";
  }
  if (driver) amb.driver = driver;
  if (phone)  amb.phone  = phone;
  await amb.save();

  res.json({ success: true, ambulance: amb });
});

// ── GET /api/admin/hospitals ──────────────────────────────────────
router.get("/hospitals", async (req, res) => {
  const hospitals = await Hospital.find();
  res.json(hospitals.map(h => ({
    id:        h.hospitalId,
    name:      h.name,
    erBeds:    h.erBeds,
    totalBeds: h.totalBeds,
    available: h.available,
    address:   h.address,
    phone:     h.phone,
  })));
});

// ── PUT /api/admin/hospital/:id ───────────────────────────────────
// Admin updates ER bed count or availability
router.put("/hospital/:id", async (req, res) => {
  const hosp = await Hospital.findOne({ hospitalId: req.params.id });
  if (!hosp) return res.status(404).json({ message: "Hospital not found" });

  const { erBeds, totalBeds, available, name } = req.body;

  if (erBeds    !== undefined) hosp.erBeds    = erBeds;
  if (totalBeds !== undefined) hosp.totalBeds = totalBeds;
  if (available !== undefined) hosp.available = available;
  if (name)                    hosp.name      = name;
  await hosp.save();

  res.json({ success: true, hospital: hosp });
});

// ── GET /api/admin/calls ──────────────────────────────────────────
// Full call log with all details
router.get("/calls", async (req, res) => {
  const calls = await Call.find().sort({ createdAt: -1 });
  res.json(calls);
});

module.exports = router;

