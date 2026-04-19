// state.js — shared live state, updated by triage agent, read by API

const state = {
  status: "standby",   // "standby" | "emergency" | "high" | "general"
  lastDispatch: null,
  activity: [],
  stats: {
    total:     0,
    emergency: 0,
    high:      0,
    general:   0,
  },
};

function addActivity(message, type = "system") {
  state.activity.unshift({
    id:      Date.now(),
    message,
    type,
    time: new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    }),
  });
  if (state.activity.length > 20) state.activity.pop();
}

function dispatchAmbulance(ambulanceId) {
  const { ambulances } = require("./db");
  const amb = ambulances.find(a => a.id === ambulanceId);
  if (amb) {
    amb.available = false;
    amb.status    = "on_trip";
  }
}

function returnAmbulance(ambulanceId) {
  const { ambulances } = require("./db");
  const amb = ambulances.find(a => a.id === ambulanceId);
  if (amb) {
    amb.available = true;
    amb.status    = "available";
  }
}

module.exports = { state, addActivity, dispatchAmbulance, returnAmbulance };