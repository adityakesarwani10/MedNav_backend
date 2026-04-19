// app.js
require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const app     = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

// Triage Agent routes (Twilio webhooks — return XML)
// const voiceRoutes = require("./routes/voice");
// app.use("/", voiceRoutes);

const router = require("./routes/router");
app.use("/", router);

// Auth routes (phone OTP login)
const authRouter = require("./routes/auth");
app.use("/api/auth", authRouter);

// User routes
const userRouter = require("./routes/userRoutes");
app.use("/api/user", userRouter);

// Admin routes
const adminRouter = require("./routes/adminRoutes");
app.use("/api/admin", adminRouter);

const apiRouter = require("./api");
app.use("/api", apiRouter);

app.get("/test", (req, res) => {
  res.json({ message: "MedNav API is working!" });
});

// app.listen(3000, () => console.log("🚀 MedNav running on port 3000")); // Moved to server.js

module.exports = app;