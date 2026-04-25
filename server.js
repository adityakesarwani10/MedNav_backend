require("dotenv").config();
const app = require("./app.js");
const { connectDB } = require("./db.js");
const keepAlive = require("./keepAlive");
// server start hone ke baad

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(3000, () => {
    console.log("Server running");
    keepAlive("https://mednav-backend.onrender.com/api/status");
  });
});
  // app.listen(PORT, () => {
  //   console.log(`🚀 MedNav Server running cleanly on port ${PORT}`);
  // });

