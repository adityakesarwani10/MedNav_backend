// Download the helper library from https://www.twilio.com/docs/node/install
// Set environment variables for your credentials
// Read more at http://twil.io/secure
require("dotenv").config();
const client = require("twilio")(
  process.env.ACCOUNT_SID,
  process.env.AUTH_TOKEN
);

client.calls.create({
  url: "https://delirious-alesha-distinctively.ngrok-free.dev/voice", // 👈 IMPORTANT CHANGE
  to: process.env.MOBILE_NUMBER, // your number
  from: process.env.TWILIO_PHONE_NUMBER,
})
.then(call => console.log("Call SID:", call.sid))
.catch(err => console.error(err));