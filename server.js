require("dotenv").config();
const app = require("./app.js");
const { connectDB } = require("./db.js");

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 MedNav Server running cleanly on port ${PORT}`);
  });
});

