const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
// const { triggerNavigator } = require("./navigator");

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Feature flag — set to true when navigator.js is ready ───────────────────
const NAVIGATOR_ENABLED = false; //  flip to true to activate The Navigator

// ─── Conversation memory (keyed by CallSid) ───────────────────────────────────
// Stores the full chat history for each active call
// e.g. { "CA1234": [ {role:"user", content:"fever"}, {role:"assistant", content:"..."} ] }
const callHistory = {};

// Auto-cleanup after 10 minutes to prevent memory leak
function cleanupCall(callSid) {
  setTimeout(() => {
    delete callHistory[callSid];
    console.log(`🧹 Cleaned up history for call: ${callSid}`);
  }, 10 * 60 * 1000);
}

// ─── Problem keyword filter ───────────────────────────────────────────────────
const problemKeywords = [
  "chest pain", "headache", "accident", "murder", "fever", "bleeding",
  "injury", "pain", "stroke", "breathe", "breath", "unconscious",
  "fracture", "burn", "vomit", "symptom", "symptoms", "ill", "sick",
  "hurt", "broken", "cut", "fall", "poison", "allergic", "seizure",
  "dizzy", "dizziness", "swelling", "rash", "bite", "attack", "heart",
  "night", "days", "hours", "since", "last", "started", "worse", "better",
  // ↑ These extra keywords help recognize follow-up messages like
  // "for the last 2 nights" which don't contain classic medical words
];

// ─── Exit keywords ────────────────────────────────────────────────────────────
const exitKeywords = ["exit", "quit", "hang up", "hangup", "bye", "end", "stop"];

// ─── Patient mock location ────────────────────────────────────────────────────
const PATIENT_LAT = 25.4358;
const PATIENT_LNG = 81.8463;

// ─── System prompt (single source of truth) ───────────────────────────────────
const SYSTEM_PROMPT = `You are a calm, empathetic medical triage assistant on a phone call in India.
You are having a CONVERSATION with a patient. You remember everything they have said so far.

Your job:
1. If you don't have enough information yet, ask ONE short follow-up question
2. Once you have enough, classify and triage the patient

Always respond ONLY with valid JSON — no markdown, no explanation:
{
  "specialist": "cardiologist",
  "priority": "emergency",
  "requirements": "ECG, ICU bed",
  "condition": "Acute Chest Pain",
  "reply": "I understand. Please stay calm, help is coming.",
  "needsMore": false
}

Field rules:
- specialist: medical specialist needed (cardiologist, orthopedic, neurologist, general physician, burn unit, ENT, psychiatrist, pulmonologist)
- priority: "emergency" | "high" | "medium" | "low"
- requirements: comma-separated needs (ECG, ICU, X-ray, blood test, oxygen, IV drip)
- condition: short medical condition name (2-5 words)
- reply: what to say OUT LOUD — 1-2 sentences, calm, human, reassuring
- needsMore: true if you still need more details to triage properly, false if you're ready

Priority mapping:
- emergency: chest pain, stroke, can't breathe, unconscious, severe bleeding, heart attack, seizure
- high: high fever (above 103F), severe injury, fracture, burn, vomiting blood, allergic reaction
- medium: moderate fever, mild injury, persistent vomiting, dizziness
- low: mild cold, minor cut, routine checkup

When needsMore is TRUE:
- Ask ONE specific short question based on what you already know from the conversation
- Do NOT repeat questions you already asked
- Examples: "How long have you had the fever?", "Is the pain sharp or dull?", "Where exactly does it hurt?"
- Set specialist, priority, requirements to empty strings, condition to "Gathering info"

When needsMore is FALSE:
- Acknowledge their issue warmly
- You have enough from the full conversation to make a decision
- Fill all fields properly

ONLY return JSON. Nothing else.`;

// ─── Route 1: Incoming call ───────────────────────────────────────────────────
router.post("/voice", (req, res) => {
  res.type("text/xml");

  const callSid = req.body.CallSid;

  // Initialize fresh history for this call
  if (callSid && !callHistory[callSid]) {
    callHistory[callSid] = [];
    console.log(`📞 New call started: ${callSid}`);
  }

  res.send(`
    <Response>
      <Gather input="speech" action="/process-speech" method="POST" timeout="6" speechTimeout="auto" enhanced="true"
  language="en-IN">
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
  const callSid    = req.body.CallSid || "unknown";
  const callerNum  = req.body.From    || "Unknown";

  console.log("\n─────────────────────────────────");
  console.log("📞 CallSid:", callSid);
  console.log("🗣  Said:", speechText);

  // ── Initialize history if somehow missing ──────────────────────────────────
  if (!callHistory[callSid]) {
    callHistory[callSid] = [];
  }

  // ── Nothing heard ──────────────────────────────────────────────────────────
  if (!speechText) {
    return res.send(`
      <Response>
        <Say voice="Polly.Aditi">I didn't catch that. Please go ahead and describe your problem.</Say>
        <Gather input="speech" action="/process-speech" method="POST" timeout="5" speechTimeout="auto" enhanced="true" language="en-IN">
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

  // ── Keyword filter — only skip on FIRST message, not follow-ups ───────────
  // If history is empty this is the first message — check for medical context
  // If history already has messages — patient is continuing, always proceed
  const isFirstMessage = callHistory[callSid].length === 0;
  const hasProblem = problemKeywords.some((kw) => speechText.includes(kw));

  if (isFirstMessage && !hasProblem) {
    return res.send(`
      <Response>
        <Say voice="Polly.Aditi">
          I didn't quite understand. Please describe your medical problem or symptoms clearly.
        </Say>
        <Gather input="speech" action="/process-speech" method="POST" timeout="4" speechTimeout="auto" enhanced="true"
  language="en-IN">
          <Say voice="Polly.Aditi">Go ahead, I'm listening.</Say>
        </Gather>
        <Say voice="Polly.Aditi">I didn't hear anything. Please try again.</Say>
        <Redirect>/voice</Redirect>
      </Response>
    `);
  }

  // ── Add patient's message to history ──────────────────────────────────────
  callHistory[callSid].push({
    role: "user",
    content: speechText,
  });

  console.log(`📚 History length for ${callSid}: ${callHistory[callSid].length} messages`);

  // ── AI Triage with full conversation history ───────────────────────────────
  try {
    const aiResponse = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        // ↓ This is the full conversation so far — AI sees everything
        ...callHistory[callSid],
      ],
    });

    // ── Parse AI response ────────────────────────────────────────────────────
    const raw = aiResponse.choices[0].message.content.trim();
    console.log("🤖 AI raw:", raw);

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      result = JSON.parse(cleaned);
    }

    const { specialist, priority, requirements, condition, reply, needsMore } = result;

    console.log("📋 Condition:", condition);
    console.log("👨‍⚕️ Specialist:", specialist);
    console.log("🚨 Priority:", priority);
    console.log("🔄 Needs more:", needsMore);

    // ── Add AI reply to history so next turn has full context ────────────────
    callHistory[callSid].push({
      role: "assistant",
      content: reply,
    });

    // ── AI needs more info — ask follow-up and keep listening ────────────────
    if (needsMore) {
      return res.send(`
        <Response>
          <Say voice="Polly.Aditi">${reply}</Say>
          <Gather input="speech" action="/process-speech" method="POST" timeout="4" speechTimeout="auto" enhanced="true"
  language="en-IN">
          </Gather>
          <Say voice="Polly.Aditi">I didn't hear that. Please continue describing your problem.</Say>
          <Redirect>/process-speech</Redirect>
        </Response>
      `);
    }

    // ── Triage complete — clean up history ────────────────────────────────────
    cleanupCall(callSid);

    // ── EMERGENCY — fire navigator ────────────────────────────────────────────
    if (priority === "emergency") {
      // NAVIGATOR_ENABLED — flip flag to true at top of file to activate
      if (NAVIGATOR_ENABLED) {
        triggerNavigator(PATIENT_LAT, PATIENT_LNG, condition, callerNum)
          .then((nav) => {
            console.log("🚑 Dispatched:", nav.ambulance?.name, "| ETA:", nav.ambulance?.eta);
            console.log("🏥 Hospital:", nav.hospital?.name);
          })
          .catch((err) => console.error("Navigator error:", err));
      } else {
        console.log("🚩 Navigator disabled — set NAVIGATOR_ENABLED = true to activate");
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