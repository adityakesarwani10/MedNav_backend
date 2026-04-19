<div align="center">

# 🚑 MedNav
### AI Emergency Response System

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Twilio](https://img.shields.io/badge/Twilio-F22F46?style=flat-square&logo=twilio&logoColor=white)](https://twilio.com)
[![Groq](https://img.shields.io/badge/Groq%20LLaMA-F55036?style=flat-square)](https://groq.com)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![HackDiwas](https://img.shields.io/badge/HackDiwas%203.0-AgentVerse-7C3AED?style=flat-square)](https://hackdiwas.com)

<br/>

> *Every 8 minutes in India, someone dies in an emergency — not because help was unavailable, but because the system was too slow to coordinate it.*
>
> **MedNav fixes that.**

<br/>

**No app. No form. No hold music. Just call.**

</div>

---

## What is MedNav?

MedNav is a **voice-first, dual-agent AI emergency response system** that replaces the slow human dispatch loop with two autonomous AI agents that think, decide, and act in real time — triggered by nothing more than a phone call.

A patient calls a number, speaks their symptoms in plain language, and within **under 5 seconds**:

- An ambulance is dispatched to their location
- The hospital ER is pre-alerted with the patient's condition
- An SMS confirmation with ETA is sent to the patient
- A live dashboard updates in real time

No human operator involved. No delay.

---

## The Two Agents

**🟢 Triage Agent** — answers the call, listens to the patient, holds a real conversation with memory across the full call, asks follow-up questions when needed, and classifies the emergency as one of four priority levels.

**🔴 Navigator Agent** — fires simultaneously the moment an emergency is detected. Finds the nearest available ambulance using real distance calculation, picks the best hospital by ER bed capacity, and pre-alerts both — before the call even ends.

---

## What Makes It Different

- Works on **any basic phone** — no smartphone, no app, no internet needed
- AI remembers the **full conversation** — never loses context mid-call
- Asks **smart follow-up questions** when symptoms are too vague to classify
- Hospital is **pre-alerted before patient arrives** — doctors prepare in advance
- Reduces emergency coordination time from **10–12 minutes → under 5 seconds**
- Built-in **fallback** — auto-dials a human operator if AI fails
- Twilio simultaneously calls both **ambulance driver and hospital ER desk**

---

## Tech Stack

| | Technology |
|---|---|
| Voice calls | Twilio Voice API |
| AI brain | Groq LLaMA 3.3 70B |
| Backend | Node.js + Express |
| Frontend | React + Tailwind CSS |
| Auth | Phone OTP + JWT |
| Distance calc | Haversine formula |
| Notifications | Twilio SMS |

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/your-username/mednav.git
cd mednav

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Fill in your Twilio and Groq API keys

# Start the server
node app.js

# In a new terminal — expose to internet
ngrok http 3000
```

Set your Twilio webhook to `https://your-ngrok-url.ngrok.io/voice` and call your Twilio number.

---

## Built By

**Team AgentVerse** — HackDiwas 3.0