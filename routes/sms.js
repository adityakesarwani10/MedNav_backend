// sms.js — SMS notification helper

async function sendSMS(twilioClient, message) {
  try {
    const response = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.MOBILE_NUMBER,
    });
    console.log("📱 SMS status:", response.status);
    console.log("📱 SMS sent to:", process.env.MOBILE_NUMBER);
    console.log("Message:", message);
  } catch (err) {
    console.error("SMS error:", err.message);
  }
}

export { sendSMS };
