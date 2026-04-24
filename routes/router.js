const express  = require("express");
const router   = express.Router();
require("dotenv").config();

const Groq   = require("groq-sdk");
const twilio = require("twilio");

const { triggerNavigator }                                        = require("../navigator");
const { NAVIGATOR_ENABLED, MESSAGE_SENDING_ENABLED,
        CALLING_ENABLED, PATIENT_LAT, PATIENT_LNG,
        problemKeywords, exitKeywords, SYSTEM_PROMPT }            = require("./config");
const { initHistory, getHistory, pushToHistory, cleanupCall }     = require("./history");
const { sendSMS }                                                 = require("./sms");
const { state, addActivity, dispatchAmbulance }                   = require("../state");
const { Call, Ambulance, Hospital }                               = require("../db");

const client       = new Groq({ apiKey: process.env.GROQ_API_KEY });
const twilioClient = twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

// ── Helper: log a completed call to DB ───────────────────────────
async function logCall(data) {
  const entry = await Call.create({
    timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
    ...data,
  });
  // Keep only last 100 calls
  const count = await Call.countDocuments();
  if (count > 100) {
    const oldest = await Call.find().sort({ createdAt: 1 }).limit(count - 100);
    await Call.deleteMany({ _id: { $in: oldest.map(o => o._id) } });
  }
  return entry;
}

// ── Route 1: Incoming call ────────────────────────────────────────
router.post("/voice", (req, res) => {
  res.type("text/xml");
  initHistory(req.body.CallSid);
  addActivity("New incoming call received", "system");

  res.send(`
    <Response>
      <Gather input="speech" action="/process-speech" method="POST"
              timeout="6" speechTimeout="auto" enhanced="true" language="en-IN">
        <Say voice="Polly.Aditi">
          Hello! You have reached the MedNav emergency medical helpline.
          Please describe your problem or symptoms.
          Say end or goodbye whenever you want to finish the call.
        </Say>
      </Gather>
      <Say voice="Polly.Aditi">I didn't hear anything. Please try again.</Say>
      <Redirect>/voice</Redirect>
    </Response>
  `);
});

// ── Route 2: Main speech processing ──────────────────────────────
router.post("/process-speech", async (req, res) => {
  res.type("text/xml");

  const speechText = (req.body.SpeechResult || "").toLowerCase().trim();
  const callSid    = req.body.CallSid || "unknown";
  const callerNum  = req.body.From    || "Unknown";

  console.log("\n─────────────────────────────────");
  console.log("📞 CallSid:", callSid);
  console.log("🗣  Said:", speechText);

  // ── Nothing heard ─────────────────────────────────────────────
  if (!speechText) {
    return res.send(`
      <Response>
        <Say voice="Polly.Aditi">I didn't catch that. Please go ahead and describe your problem.</Say>
        <Gather input="speech" action="/process-speech" method="POST"
                timeout="5" speechTimeout="auto" enhanced="true" language="en-IN">
        </Gather>
        <Redirect>/voice</Redirect>
      </Response>
    `);
  }

  // ── Exit condition ────────────────────────────────────────────
  if (exitKeywords.some(w => speechText.includes(w))) {
    cleanupCall(callSid);
    return res.send(`
      <Response>
        <Say voice="Polly.Aditi">Okay, ending the call. Please stay safe. Goodbye!</Say>
        <Hangup/>
      </Response>
    `);
  }

  // ── Keyword filter (first message only) ──────────────────────
  const history        = getHistory(callSid);
  const isFirstMessage = history.length === 0;
  const hasProblem     = problemKeywords.some(kw => speechText.includes(kw));

  if (isFirstMessage && !hasProblem) {
    return res.send(`
      <Response>
        <Say voice="Polly.Aditi">
          I didn't quite understand. Please describe your medical problem or symptoms clearly.
        </Say>
        <Gather input="speech" action="/process-speech" method="POST"
                timeout="4" speechTimeout="auto" enhanced="true" language="en-IN">
          <Say voice="Polly.Aditi">Go ahead, I am listening.</Say>
        </Gather>
        <Say voice="Polly.Aditi">I didn't hear anything. Please try again.</Say>
        <Redirect>/voice</Redirect>
      </Response>
    `);
  }

  // ── Add patient message to history ───────────────────────────
  pushToHistory(callSid, "user", speechText);
  console.log(`📚 History length: ${getHistory(callSid).length} messages`);

  // ── AI Triage ─────────────────────────────────────────────────
  try {
    const aiResponse = await client.chat.completions.create({
      model:      "llama-3.3-70b-versatile",
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...getHistory(callSid),
      ],
    });

    const raw = aiResponse.choices[0].message.content.trim();
    console.log("🤖 AI raw:", raw);

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      result = JSON.parse(raw.replace(/```json|```/g, "").trim());
    }

    const { specialist, priority, requirements, condition, reply, needsMore } = result;

    console.log("📋 Condition:", condition);
    console.log("👨‍⚕️ Specialist:", specialist);
    console.log("🚨 Priority:", priority);
    console.log("🔄 Needs more:", needsMore);

    pushToHistory(callSid, "assistant", reply);

    // ── Needs more — keep listening ───────────────────────────
    if (needsMore) {
      return res.send(`
        <Response>
          <Say voice="Polly.Aditi">${reply}</Say>
          <Gather input="speech" action="/process-speech" method="POST"
                  timeout="4" speechTimeout="auto" enhanced="true" language="en-IN">
          </Gather>
          <Say voice="Polly.Aditi">I didn't hear that. Please continue describing your problem.</Say>
          <Redirect>/process-speech</Redirect>
        </Response>
      `);
    }

    // ── Triage complete ───────────────────────────────────────
    cleanupCall(callSid);

    // ── EMERGENCY ─────────────────────────────────────────────
    if (priority === "emergency") {

      // Find nearest available ambulance
      const nearestAmb = await Ambulance.findOne({ available: true }) || await Ambulance.findOne();
      const bestHosp   = await Hospital.findOne({ available: true })  || await Hospital.findOne();

      // ↓ Update shared state — frontend sees this within 2 seconds
      state.status = "emergency";
      state.stats.total++;
      state.stats.emergency++;
      state.lastDispatch = {
        condition,
        specialist,
        priority,
        caller:     callerNum,
        callId:     `CALL-${Date.now()}`,
        ambulance:  nearestAmb.ambulanceId,
        ambName:    nearestAmb.plate,
        driver:     nearestAmb.driver,
        eta:        "6 mins",
        distanceKm: "2.4",
        hospital:   bestHosp.name,
        erBeds:     bestHosp.erBeds,
        timestamp:  new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
        timeline: [
          { event: "Request received",        time: new Date().toLocaleTimeString(), done: true  },
          { event: `${nearestAmb.plate} dispatched`, time: new Date().toLocaleTimeString(), done: true  },
          { event: "En route to your location",      time: new Date().toLocaleTimeString(), done: true  },
          { event: "Expected arrival",               time: "~" + new Date(Date.now() + 6*60000).toLocaleTimeString(), done: false },
        ],
      };
      await dispatchAmbulance(nearestAmb.ambulanceId);
      addActivity(`Ambulance ${nearestAmb.plate} dispatched — ${condition}`, "emergency");
      await logCall({ condition, specialist, priority, caller: callerNum, status: "active",
                ambulance: nearestAmb.plate, hospital: bestHosp.name });
                
      console.log("state:", state);
      console.log("🚑 Dispatched ambulance:", nearestAmb.plate, "| Driver:", nearestAmb.driver);

      // Navigator
      if (NAVIGATOR_ENABLED) {
        triggerNavigator(PATIENT_LAT, PATIENT_LNG, condition, callerNum)
          .then(nav => {
            console.log("🚑 Dispatched:", nav.ambulance?.name, "| ETA:", nav.ambulance?.eta);
            console.log("🏥 Hospital:", nav.hospital?.name);
          })
          .catch(err => console.error("Navigator error:", err));
      } else {
        console.log("🚩 Navigator disabled — flip NAVIGATOR_ENABLED in config.js");
      }

      // SMS
      if (MESSAGE_SENDING_ENABLED) {
        await sendSMS(twilioClient, `🚨 MedNav: ${condition} detected. Ambulance dispatched. Hospital alerted. Stay calm.`);
      }

      return res.send(`
        <Response>
          <Say voice="Polly.Aditi">${reply}</Say>
          <Say voice="Polly.Aditi">
            This is an emergency. We are dispatching an ambulance to your location right now.
            The hospital has been alerted and will be ready for your arrival.
            Please stay calm and do not move unless necessary.
            Help is on the way. You are not alone.
          </Say>
          <Hangup/>
        </Response>
      `);
    }

    // ── HIGH priority ─────────────────────────────────────────
    if (priority === "high") {
      state.status = "high";
      state.stats.total++;
      state.stats.high++;
      state.lastDispatch = {
        condition, specialist, priority, requirements,
        caller:    callerNum,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
      };
      addActivity(`Urgent: ${condition} — ${specialist} notified`, "high");
      await logCall({ condition, specialist, priority, caller: callerNum, status: "completed" });

      if (MESSAGE_SENDING_ENABLED) {
        await sendSMS(twilioClient, `⚠️ MedNav: ${condition}. ${specialist} notified. Arrange: ${requirements}. Team calls shortly.`);
      }

      return res.send(`
        <Response>
          <Say voice="Polly.Aditi">${reply}</Say>
          <Say voice="Polly.Aditi">
            We are connecting you to a ${specialist} on high priority.
            Please arrange ${requirements} if possible.
            A medical team will contact you very shortly. Please stay calm.
          </Say>
          <Hangup/>
        </Response>
      `);
    }

    // ── MEDIUM / LOW ──────────────────────────────────────────
    state.status = "general";
    state.stats.total++;
    state.stats.general++;
    state.lastDispatch = {
      condition, specialist, priority,
      caller:    callerNum,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
    };
    addActivity(`General: ${condition} — appointment scheduled`, "general");
    await logCall({ condition, specialist, priority, caller: callerNum, status: "completed" });

    if (MESSAGE_SENDING_ENABLED) {
      await sendSMS(twilioClient, `📋 MedNav: ${condition}. Scheduling ${specialist}. We will contact you shortly.`);
    }

    return res.send(`
      <Response>
        <Say voice="Polly.Aditi">${reply}</Say>
        <Say voice="Polly.Aditi">
          We are scheduling you with a ${specialist}.
          ${requirements ? `Please arrange ${requirements}.` : ""}
          We will notify you shortly. Take care and stay safe.
        </Say>
        <Hangup/>
      </Response>
    `);

  } catch (err) {
    console.error("❌ Error:", err.message);
    cleanupCall(callSid);
    return res.send(`
      <Response>
        <Say voice="Polly.Aditi">
          I am sorry, I am having a technical issue right now.
          Connecting you to our emergency team immediately. Please hold.
        </Say>
        <Dial>+91XXXXXXXXXX</Dial>
      </Response>
    `);
  }
});

module.exports = router;

