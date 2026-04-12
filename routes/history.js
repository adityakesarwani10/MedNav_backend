// history.js — Call memory (stores full conversation per call using CallSid)

const callHistory = {};

function initHistory(callSid) {
  if (callSid && !callHistory[callSid]) {
    callHistory[callSid] = [];
    console.log(`📞 New call started: ${callSid}`);
  }
}

function getHistory(callSid) {
  return callHistory[callSid] || [];
}

function pushToHistory(callSid, role, content) {
  if (!callHistory[callSid]) callHistory[callSid] = [];
  callHistory[callSid].push({ role, content });
}

function cleanupCall(callSid) {
  setTimeout(() => {
    delete callHistory[callSid];
    console.log(`🧹 Cleaned up history for call: ${callSid}`);
  }, 10 * 60 * 1000);
}

module.exports = { initHistory, getHistory, pushToHistory, cleanupCall };