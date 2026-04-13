// router.js — Main routes only
import express from "express";
import "dotenv/config";

const router = express.Router();

const { Groq } = await import("groq-sdk");
const twilioMod = await import("twilio");

const { triggerNavigator } = await import("../navigator.js");
import { 
  NAVIGATOR_ENABLED, MESSAGE_SENDING_ENABLED,
  PATIENT_LAT, PATIENT_LNG,
  problemKeywords, exitKeywords, SYSTEM_PROMPT 
} from "./config.js";

import { 
  initHistory, getHistory,
  pushToHistory, cleanupCall 
} from "./history.js";

import { sendSMS } from "./sms.js";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const twilioClient = twilioMod.default(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

// ─── Route 1: Incoming call ───────────────────────────────────────────────────
router.post("/voice", (req, res) => {
  res.type("text/xml");
  initHistory(req.body.CallSid);
  res.send(`
    <Response>
      <Gather input="speech" action="/process-speech" method="POST"
              timeout="6" speechTimeout="auto" enhanced="true" language="en-IN">
        <Say voice="Polly.Aditi">
          Hello! You have reached the emergency medical helpline.
          Please describe your problem or symptoms.
          Say end or goodbye whenever you want to finish the call.
        </Say>
      </Gather>
      <Say voice="Polly.Aditi">I didn't hear anything. Please try again.</Say>
      <Redirect>/voice</Redirect>
    </Response>
  `);
});

// ─── Route 2: Main speech processing ─────────────────────────────────────────
router.post("/process-speech", async (req, res) => {
  res.type("text/xml");

  const speechText = (req.body.SpeechResult || "").toLowerCase().trim();
  const callSid = req.body.CallSid || "unknown";
  const callerNum = req.body.From || "Unknown";

  console.log("\n─────────────────────────────────");
  console.log("📞 CallSid:", callSid);
  console.log("🗣  Said:", speechText);

  // ── Nothing heard ──────────────────────────────────────────────────────────
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

  // ── Exit condition ─────────────────────────────────────────────────────────
  if (exitKeywords.some((w) => speechText.includes(w))) {
    cleanupCall(callSid);
    return res.send(`
      <Response>
        <Say voice="Polly.Aditi">Okay, ending the call. Please stay safe. Goodbye!</Say>
        <Hangup/>
      </Response>
    `);
  }

  // ── Keyword filter (first message only) ───────────────────────────────────
  const history = getHistory(callSid);
  const isFirstMessage = history.length === 0;
  const hasProblem = problemKeywords.some((kw) => speechText.includes(kw));

  if (isFirstMessage && !hasProblem) {
    return res.send(`
      <Response>
        <Say voice="Polly.Aditi">
          I didn't quite understand. Please describe your medical problem or symptoms clearly.
        </Say>
        <Gather input="speech" action="/process-speech" method="POST"
                timeout="4" speechTimeout="auto" enhanced="true" language="en-IN">
          <Say voice="Polly.Aditi">Go ahead, I'm listening.</Say>
        </Gather>
        <Say voice="Polly.Aditi">I didn't hear anything. Please try again.</Say>
        <Redirect>/voice</Redirect>
      </Response>
    `);
  }

  // ── Add patient message to history ────────────────────────────────────────
  pushToHistory(callSid, "user", speechText);
  console.log(`📚 History length for ${callSid}: ${getHistory(callSid).length} messages`);

  // ── AI Triage ──────────────────────────────────────────────────────────────
  try {
    const aiResponse = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...getHistory(callSid),
      ],
    });

    // ── Parse response ───────────────────────────────────────────────────────
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

    // ── Save AI reply to history ──────────────────────────────────────────────
    pushToHistory(callSid, "assistant", reply);

    // ── Needs more info — keep listening ──────────────────────────────────────
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

    // ── Triage complete ────────────────────────────────────────────────────────
    cleanupCall(callSid);

    // ── EMERGENCY ─────────────────────────────────────────────────────────────
    if (priority === "emergency") {
      if (NAVIGATOR_ENABLED) {
        triggerNavigator(PATIENT_LAT, PATIENT_LNG, condition, callerNum)
          .then((nav) => {
            console.log("🚑 Dispatched:", nav.ambulance?.name, "| ETA:", nav.ambulance?.eta);
            console.log("🏥 Hospital:", nav.hospital?.name);
          })
          .catch((err) => console.error("Navigator error:", err));
      } else {
        console.log("🚩 Navigator disabled — flip NAVIGATOR_ENABLED in config.js");
      }

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

    // ── HIGH priority ─────────────────────────────────────────────────────────
    if (priority === "high") {
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

    // ── MEDIUM / LOW priority ─────────────────────────────────────────────────
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

export default router;

