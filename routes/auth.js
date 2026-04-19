// routes/auth.js
const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const { users, otpStore, sessions } = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "mednav_secret_key";

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// For demo — just log OTP (replace with Twilio SMS in prod)
async function sendOTP(phone, otp) {
  console.log(`📱 OTP for ${phone}: ${otp}`);
  // In production:
  // await twilioClient.messages.create({
  //   body: `Your MedNav OTP is ${otp}. Valid for 5 minutes.`,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: phone
  // });
}

// ── POST /api/auth/send-otp ───────────────────────────────────────
// Frontend sends: { phone: "+919876543210" }
router.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: "Phone number required" });
  }

  // Check if user exists — if not, create them
  let user = users.find(u => u.phone === phone);
  if (!user) {
    user = {
      id:        `USR-${Date.now()}`,
      name:      "New User",
      phone,
      role:      "user",
      verified:  false,
      createdAt: new Date().toISOString()
    };
    users.push(user);
  }

  const otp     = generateOTP();
  const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore[phone] = { otp, expires };
  await sendOTP(phone, otp);

  res.json({ success: true, message: "OTP sent successfully" });
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────
// Frontend sends: { phone: "+919876543210", otp: "123456" }
router.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: "Phone and OTP required" });
  }

  const stored = otpStore[phone];
  console.log(`Verifying OTP for ${phone}: entered ${otp}, expected ${stored?.otp}`);
  console.log(`Current OTP store:`, otpStore);

  if (!stored)                      return res.status(400).json({ success: false, message: "OTP not sent" });
  if (Date.now() > stored.expires)  return res.status(400).json({ success: false, message: "OTP expired" });
  if (stored.otp !== otp)           return res.status(400).json({ success: false, message: "Wrong OTP" });

  delete otpStore[phone]; // clear OTP after use

  const user = users.find(u => u.phone === phone);
  user.verified = true;

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  sessions[token] = user.id;

  res
  .setHeader("Authorization", `Bearer ${token}`)
  .json({
    success: true,
    token,
    user: {
      id:    user.id,
      name:  user.name,
      phone: user.phone,
      role:  user.role,
    }
  })
});

// ── POST /api/auth/logout ─────────────────────────────────────────
router.post("/logout", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) delete sessions[token];
  res.json({ success: true });
});

const {authenticate} = require("../middleware");
// ── GET /api/auth/me ──────────────────────────────────────────────
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;