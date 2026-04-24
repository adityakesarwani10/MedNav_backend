const { Ambulance } = require("./db");

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

async function dispatchAmbulance(ambulanceId) {
  await Ambulance.findOneAndUpdate(
    { ambulanceId },
    { available: false, status: "on_trip" },
    { new: true }
  );
}

async function returnAmbulance(ambulanceId) {
  await Ambulance.findOneAndUpdate(
    { ambulanceId },
    { available: true, status: "available" },
    { new: true }
  );
}

module.exports = { state, addActivity, dispatchAmbulance, returnAmbulance };

