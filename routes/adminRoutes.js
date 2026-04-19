// routes/adminRoutes.js
const express  = require("express");
const router   = express.Router();
const { authenticate, adminOnly } = require("../middleware");
const { users, ambulances, hospitals, calls } = require("../db");
const { state } = require("../state");

// All admin routes require auth + admin role
router.use(authenticate, adminOnly);

// ── GET /api/admin/overview ───────────────────────────────────────
// Feeds: Admin dashboard summary stats
router.get("/overview", (req, res) => {
  res.json({
    stats: {
      totalUsers:        users.filter(u => u.role === "user").length,
      totalCalls:        calls.length,
      emergencyCalls:    calls.filter(c => c.priority === "emergency").length,
      availableAmbs:     ambulances.filter(a => a.available).length,
      totalAmbs:         ambulances.length,
      availableHospitals: hospitals.filter(h => h.available).length,
    },
    recentActivity: state.activity,
    systemStatus:   state.status,
  });
});

// ── GET /api/admin/users ──────────────────────────────────────────
// Feeds: Admin user list
router.get("/users", (req, res) => {
  res.json(users.map(u => ({
    id:        u.id,
    name:      u.name,
    phone:     u.phone,
    role:      u.role,
    verified:  u.verified,
    createdAt: u.createdAt,
  })));
});

// ── PUT /api/admin/users/:id ──────────────────────────────────────
// Change user role or name from admin panel
router.put("/users/:id", (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const { name, role } = req.body;
  if (name) user.name = name;
  if (role && ["user","admin"].includes(role)) user.role = role;

  res.json({ success: true, user });
});

// ── GET /api/admin/fleet ──────────────────────────────────────────
// Admin sees full ambulance details including phone numbers
router.get("/fleet", (req, res) => {
  res.json(ambulances);
});

// ── PUT /api/admin/ambulance/:id ──────────────────────────────────
// Admin changes ambulance status
router.put("/ambulance/:id", (req, res) => {
  const amb = ambulances.find(a => a.id === req.params.id);
  if (!amb) return res.status(404).json({ message: "Ambulance not found" });

  const { status, driver, phone } = req.body;

  if (status) {
    amb.status    = status;
    amb.available = status === "available";
  }
  if (driver) amb.driver = driver;
  if (phone)  amb.phone  = phone;

  res.json({ success: true, ambulance: amb });
});

// ── GET /api/admin/hospitals ──────────────────────────────────────
router.get("/hospitals", (req, res) => {
  res.json(hospitals);
});

// ── PUT /api/admin/hospital/:id ───────────────────────────────────
// Admin updates ER bed count or availability
router.put("/hospital/:id", (req, res) => {
  const hosp = hospitals.find(h => h.id === req.params.id);
  if (!hosp) return res.status(404).json({ message: "Hospital not found" });

  const { erBeds, totalBeds, available, name } = req.body;

  if (erBeds    !== undefined) hosp.erBeds    = erBeds;
  if (totalBeds !== undefined) hosp.totalBeds = totalBeds;
  if (available !== undefined) hosp.available = available;
  if (name)                    hosp.name      = name;

  res.json({ success: true, hospital: hosp });
});

// ── GET /api/admin/calls ──────────────────────────────────────────
// Full call log with all details
router.get("/calls", (req, res) => {
  res.json(calls);
});

module.exports = router;