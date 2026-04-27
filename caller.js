// caller.js — Outbound calls to ambulance and hospital

const twilio = require("twilio");

async function callAmbulance(twilioClient, ambulancePhone, dispatchInfo) {
  try {
    const call = await twilioClient.calls.create({
      url: `${process.env.BASE_URL}/voice`,
      to: ambulancePhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      twiml: `
        <Response>
          <Say voice="Polly.Aditi">
            Emergency dispatch alert. 
            Patient condition: ${dispatchInfo.condition}.
            Proceed immediately to the patient location.
            Estimated distance: ${dispatchInfo.distanceKm} kilometers.
            Estimated travel time: ${dispatchInfo.eta}.
            This is an automated MedNav emergency dispatch.
            Please confirm by pressing 1.
          </Say>
          <Gather numDigits="1" timeout="10">
          </Gather>
          <Say voice="Polly.Aditi">
            No response received. Please check your dispatch system immediately.
          </Say>
        </Response>
      `
    });
    console.log("🚑 Ambulance call initiated:", call.sid);
    return { success: true, sid: call.sid };
  } catch (err) {
    console.error("Ambulance call error:", err.message);
    return { success: false, error: err.message };
  }
}

async function callHospital(twilioClient, hospitalPhone, patientInfo) {
  try {
    const call = await twilioClient.calls.create({
      url: "https://delirious-alesha-distinctively.ngrok-free.dev/voice",
      to: hospitalPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      twiml: `
        <Response>
          <Say voice="Polly.Aditi">
            Urgent hospital alert from MedNav.
            Incoming emergency patient.
            Condition: ${patientInfo.condition}.
            Specialist required: ${patientInfo.specialist}.
            Prepare: ${patientInfo.requirements}.
            Ambulance unit ${patientInfo.ambulanceId} is en route.
            Estimated arrival: ${patientInfo.eta}.
            Please prepare the emergency room immediately.
          </Say>
          <Pause length="1"/>
          <Say voice="Polly.Aditi">
            This is an automated MedNav emergency alert. Thank you.
          </Say>
        </Response>
      `
    });
    console.log("🏥 Hospital call initiated:", call.sid);
    return { success: true, sid: call.sid };
  } catch (err) {
    console.error("Hospital call error:", err.message);
    return { success: false, error: err.message };
  }
}

// ── Main function — fires BOTH calls simultaneously ──────────────────────────
async function dispatchCalls(twilioClient, navResult, patientInfo) {
  console.log("\n📞 Firing simultaneous calls...");

  const ambulancePhone = process.env.AMBULANCE_PHONE;  // driver's number
  const hospitalPhone  = process.env.HOSPITAL_PHONE;   // ER desk number

  const [ambulanceResult, hospitalResult] = await Promise.all([
    callAmbulance(twilioClient, ambulancePhone, {
      condition:   patientInfo.condition,
      distanceKm:  navResult.ambulance.distanceKm,
      eta:         navResult.ambulance.eta,
      ambulanceId: navResult.ambulance.id,
    }),
    callHospital(twilioClient, hospitalPhone, {
      condition:   patientInfo.condition,
      specialist:  patientInfo.specialist,
      requirements: patientInfo.requirements,
      ambulanceId: navResult.ambulance.id,
      eta:         navResult.hospital.eta,
    }),
  ]);

  console.log("🚑 Ambulance call:", ambulanceResult.success ? "SUCCESS" : "FAILED");
  console.log("🏥 Hospital call:", hospitalResult.success ? "SUCCESS" : "FAILED");

  return { ambulanceResult, hospitalResult };
}

module.exports = { dispatchCalls };