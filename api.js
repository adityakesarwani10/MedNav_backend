// api.js — JSON endpoints polled by frontend every 2 seconds

const express              = require("express");
const router               = express.Router();
const { state }            = require("./state");
const { ambulances, hospitals, calls } = require("./db");

// ── GET /api/status ───────────────────────────────────────────────
// Main polling endpoint — frontend calls this every 2 seconds
// Returns: live system status, last dispatch, stats, recent activity
router.get("/status", (req, res) => {
  res.json({
    status:       state.status,
    lastDispatch: state.lastDispatch,
    stats:        state.stats,
    activity:     state.activity.slice(0, 10),
  });
});

// ── GET /api/fleet ────────────────────────────────────────────────
// Returns: ambulance availability for Fleet Snapshot widget
router.get("/fleet", (req, res) => {
  res.json(
    ambulances.map(a => ({
      id:        a.id,
      plate:     a.plate,
      driver:    a.driver,
      status:    a.status,       // "available" | "on_trip" | "maintenance"
      available: a.available,
      hospital:  a.hospital,
    }))
  );
});

// ── GET /api/hospitals ────────────────────────────────────────────
// Returns: hospital list with ER bed count
router.get("/hospitals", (req, res) => {
  res.json(
    hospitals.map(h => ({
      id:        h.id,
      name:      h.name,
      erBeds:    h.erBeds,
      totalBeds: h.totalBeds,
      available: h.available,
      address:   h.address,
    }))
  );
});

// ── GET /api/calls ────────────────────────────────────────────────
// Returns: full call log (newest first)
router.get("/calls", (req, res) => {
  res.json(calls);
});

module.exports = router;