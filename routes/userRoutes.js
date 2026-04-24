const express  = require("express");
const router   = express.Router();
const { authenticate } = require("../middleware");
const { state }        = require("../state");
const { Call, Ambulance, Hospital } = require("../db");

// ── GET /api/user/dashboard ───────────────────────────────────────
// Feeds: Dashboard page — Call Ambulance, Find Hospitals, Track stats
router.get("/dashboard", authenticate, async (req, res) => {
  const userCalls = await Call.find({ userId: req.user.userId });
  const activeCall = userCalls.find(c => c.status === "active");

  const availableAmbs = await Ambulance.countDocuments({ available: true });
  const availableHospitals = await Hospital.countDocuments({ available: true });

  res.json({
    stats: {
      totalCalls:       userCalls.length,
      activeDispatch:   !!activeCall,
      availableAmbs:    availableAmbs,
      availableHospitals: availableHospitals,
    },
    activity: state.activity.slice(0, 10),
    activeCall: activeCall || null,
  });
});

// ── GET /api/user/fleet ───────────────────────────────────────────
// Feeds: Fleet Snapshot — MH-01-AB-1234, Available/On Trip/Maintenance
router.get("/fleet", authenticate, async (req, res) => {
  const ambulances = await Ambulance.find();
  res.json(ambulances.map(a => ({
    id:        a.ambulanceId,
    plate:     a.plate,
    driver:    a.driver,
    status:    a.status,        // "available" | "on_trip" | "maintenance"
    available: a.available,
    hospital:  a.hospital,
  })));
});

// ── GET /api/user/hospitals ───────────────────────────────────────
// Feeds: Find Hospitals page — beds & emergency availability
router.get("/hospitals", authenticate, async (req, res) => {
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

// ── GET /api/user/track/:callId ───────────────────────────────────
// Feeds: Track Ambulance page — ETA, driver, status timeline
router.get("/track/:callId", authenticate, async (req, res) => {
  const call = await Call.findOne({ callId: req.params.callId });

  if (!call) {
    // Return mock active tracking for demo
    return res.json({
      callId:      "DEMO-001",
      status:      "en_route",
      eta:         "6 mins",
      distanceKm:  "2.4",
      speed:       "45 km/h",
      progress:    75,          // 0-100 for progress bar
      ambulance: {
        id:      "AMB-01",
        plate:   "MH-01-AB-1234",
        driver:  "Rajan Singh",
        phone:   "+91XXXXXXXXXX",
        hospital:"City General Hospital",
        verified: true,
      },
      timeline: [
        { event: "Request received",       time: "10:32 AM", done: true  },
        { event: "Ambulance A-102 dispatched", time: "10:33 AM", done: true  },
        { event: "En route to your location",  time: "10:34 AM", done: true  },
        { event: "Expected arrival",           time: "10:40 AM", done: false },
      ]
    });
  }

  res.json(call.trackingData);
});

// ── GET /api/user/calls ───────────────────────────────────────────
// Feeds: User call history
router.get("/calls", authenticate, async (req, res) => {
  const userCalls = await Call.find({ userId: req.user.userId }).sort({ createdAt: -1 });

  res.json(userCalls.map(c => ({
    id:        c.callId,
    condition: c.condition,
    priority:  c.priority,
    status:    c.status,
    timestamp: c.timestamp,
    ambulance: c.ambulance,
    hospital:  c.hospital,
  })));
});

module.exports = router;

