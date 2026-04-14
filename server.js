require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const voiceRoutes = require("./routes/voice");
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: false }));

app.use("/", voiceRoutes);

app.listen(3000, () => {
    console.log("Server running on port 3000");
});