require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: false }));
// Import routes
const voiceRoutes = require("./routes/voice");
app.use("/", voiceRoutes);

app.listen(3000, () => {
    console.log("Server running on port 3000");
});