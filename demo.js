const express = require("express");
const router = express.Router();
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

// 🔹 Route 1: When call starts (NO CHANGE)
router.post("/voice", (req, res) => {
    res.type("text/xml");
    res.send(`
        <Response>
            <Gather input="speech" action="/process-speech" method="POST" timeout="5">
                <Say>Hello! I am your medical assistant. Please describe your symptoms or reason for calling.</Say>
            </Gather>
            <Say>I didn't hear anything. Please try again.</Say>
            <Redirect>/voice</Redirect>
        </Response>
    `);
});

// 🔹 Route 2: Process speech — NOW WITH AI BRAIN
router.post("/process-speech", async (req, res) => {
    res.type("text/xml");
    const speechText = (req.body.SpeechResult || "").toLowerCase();
    console.log("User said:", speechText);

    // ❌ Nothing detected (NO CHANGE)
    if (!speechText) {
        return res.send(`
            <Response>
                <Say>I didn't catch that. Please say it again.</Say>
                <Redirect>/voice</Redirect>
            </Response>
        `);
    }

    // 🛑 Exit condition (NO CHANGE)
    if (["exit", "quit", "hang up", "bye", "end"].some(word => speechText.includes(word))) {
        return res.send(`
            <Response>
                <Say>Okay, ending the call. Stay safe!</Say>
                <Hangup/>
            </Response>
        `);
    }

    // 🤖 Send to Claude for triage (THIS IS THE NEW PART)
    try {
        const aiResponse = await client.messages.create({
            model: "claude-opus-4-6",
            max_tokens: 300,
            system: `You are a calm, empathetic medical triage assistant on a phone call.
            
Based on what the patient says, respond with ONLY a valid JSON object like this:
{
  "category": "EMERGENCY",
  "reply": "what to say to the patient out loud"
}

Category rules:
- EMERGENCY: chest pain, can't breathe, stroke, unconscious, severe bleeding
- URGENT: high fever, severe pain, injury, vomiting
- GENERAL: routine checkup, mild symptoms, prescription refill

Keep reply short (2 sentences max), calm, and clear. No markdown. Only JSON.`,
            messages: [{ role: "user", content: speechText }]
        });

        // Parse Claude's response
        const result = JSON.parse(aiResponse.content[0].text);
        const category = result.category;
        const reply = result.reply;

        console.log("Category:", category);
        console.log("AI reply:", reply);

        // 🚨 EMERGENCY — say reply and connect to ER
        if (category === "EMERGENCY") {
            return res.send(`
                <Response>
                    <Say>${reply}</Say>
                    <Say>Connecting you to our emergency team right now. Please hold.</Say>
                    <Dial>+91XXXXXXXXXX</Dial>
                </Response>
            `);
        }

        // 🟡 URGENT or GENERAL — reply and keep listening
        return res.send(`
            <Response>
                <Say>${reply}</Say>
                <Gather input="speech" action="/process-speech" method="POST" timeout="5">
                    <Say>Is there anything else you'd like to tell me?</Say>
                </Gather>
                <Say>I didn't hear anything. Ending the call now.</Say>
                <Hangup/>
            </Response>
        `);

    } catch (err) {
        console.error("Claude API error:", err);

        // Fallback if AI fails
        return res.send(`
            <Response>
                <Say>Sorry, I'm having trouble right now. Please hold while we connect you to our team.</Say>
                <Dial>+91XXXXXXXXXX</Dial>
            </Response>
        `);
    }
});

module.exports = router;