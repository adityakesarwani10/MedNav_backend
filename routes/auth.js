const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const { User, Otp, Session, otpStore } = require("../db");
const twilio = require("twilio");

const twilioClient = twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

const JWT_SECRET = process.env.JWT_SECRET;

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// For demo — just log OTP (replace with Twilio SMS in prod)
async function sendOTP(phone, otp, isVerified, res) {
  console.log(`📱 OTP for ${phone}: ${otp}`);
  // In production:
  if(isVerified) {
      await twilioClient.messages.create({
      body: `Your MedNav OTP is ${otp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
  }
  else {
    return res.status(200).json({success:true, message: `OTP for ${phone} is ${otp}. Valid for 5 minutes.`});
  }
}

// ── POST /api/auth/send-otp ───────────────────────────────────────
// Frontend sends: { phone: "+919876543210" }
router.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: "Phone number required" });
  }

  // Check if user exists — if not, create them
  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({
      name: "New User",
      phone,
      role: "user",
      verified: false,
    });
    console.log(`🆕 New user created: ${user.phone} (${user.userId})`);
  }

  const otp     = generateOTP();
  const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

  // Save to in-memory store for fast lookup
  otpStore[phone] = { otp, expires };

  // Also persist to DB with TTL
  await Otp.deleteMany({ phone });
  await Otp.create({ phone, otp, expiresAt: new Date(expires) });

  await sendOTP(phone, otp);

  res.json({ success: true, message: "OTP sent successfully" });
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────
// Frontend sends: { phone: "+919876543210", otp: "123456" }
router.post("/verify-otp", async (req, res) => {
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
  await Otp.deleteMany({ phone });

  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  user.verified = true;
  await user.save();

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.userId, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  await Session.create({ token, userId: user.userId });

  res
  .setHeader("Authorization", `Bearer ${token}`)
  .json({
    success: true,
    token,
    user: {
      id:    user.userId,
      name:  user.name,
      phone: user.phone,
      role:  user.role,
    }
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────
router.post("/logout", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    await Session.deleteOne({ token });
  }
  res.json({ success: true });
});

const {authenticate} = require("../middleware");
// ── GET /api/auth/me ──────────────────────────────────────────────
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

