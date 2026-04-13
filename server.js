import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import voiceRoutes from "./routes/voice.js";

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: false }));

app.use("/", voiceRoutes);

app.listen(3000, () => {
    console.log("Server running on port 3000");
});

