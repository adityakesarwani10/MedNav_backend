// navigator.js — The Logistics Navigator Agent (mock data, no paid APIs)

const ambulances = [
    { id: "AMB-01", name: "Unit Alpha", lat: 25.4358, lng: 81.8463, available: true, driver: "Rajan Singh" },
    { id: "AMB-02", name: "Unit Bravo", lat: 25.4512, lng: 81.8601, available: true, driver: "Meena Verma" },
    { id: "AMB-03", name: "Unit Charlie", lat: 25.4280, lng: 81.8750, available: false, driver: "Arjun Das" },
    { id: "AMB-04", name: "Unit Delta", lat: 25.4600, lng: 81.8300, available: true, driver: "Priya Nair" },
];

const hospitals = [
    { id: "HOSP-01", name: "City General Hospital", lat: 25.4445, lng: 81.8467, erCapacity: 8 },
    { id: "HOSP-02", name: "Apollo Medical Center", lat: 25.4390, lng: 81.8550, erCapacity: 3 },
    { id: "HOSP-03", name: "Ram Manohar Lohia Hospital", lat: 25.4500, lng: 81.8400, erCapacity: 12 },
];

// Mock road routes between common points (simulates Google Maps)
const mockRoutes = [
    { via: "MG Road", trafficMultiplier: 1.0 },
    { via: "Civil Lines Bypass", trafficMultiplier: 1.3 },
    { via: "Allahabad Ring Road", trafficMultiplier: 0.85 },
];

// Haversine formula — real distance calculation (no API needed)
function getDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Pick fastest mock route
function getBestRoute(distanceKm) {
    const best = mockRoutes.reduce((a, b) =>
        a.trafficMultiplier < b.trafficMultiplier ? a : b
    );
    const etaMinutes = Math.round((distanceKm / 40) * 60 * best.trafficMultiplier);
    return { via: best.via, etaMinutes, distanceKm: distanceKm.toFixed(2) };
}

// Find nearest available ambulance
function findNearestAmbulance(patientLat, patientLng) {
    const available = ambulances.filter((a) => a.available);
    if (!available.length) return null;

    return available
        .map((amb) => ({
            ...amb,
            distance: getDistanceKm(amb.lat, amb.lng, patientLat, patientLng),
        }))
        .sort((a, b) => a.distance - b.distance)[0];
}

// Find hospital with most ER capacity
function findBestHospital(patientLat, patientLng) {
    return hospitals
        .filter((h) => h.erCapacity > 0)
        .map((h) => ({
            ...h,
            distance: getDistanceKm(h.lat, h.lng, patientLat, patientLng),
            score: h.erCapacity / getDistanceKm(h.lat, h.lng, patientLat, patientLng),
        }))
        .sort((a, b) => b.score - a.score)[0];
}

// MAIN FUNCTION — call this when EMERGENCY is detected
async function triggerNavigator(patientLat, patientLng, emergencyType, patientName = "Unknown") {
    console.log("\n🚨 NAVIGATOR ACTIVATED");
    console.log(`Emergency type: ${emergencyType}`);
    console.log(`Patient location: ${patientLat}, ${patientLng}\n`);

    // Step 1 — Find nearest ambulance
    const ambulance = findNearestAmbulance(patientLat, patientLng);
    if (!ambulance) {
        return { error: "No ambulances available right now" };
    }

    // Step 2 — Get best route for ambulance
    const ambRoute = getBestRoute(ambulance.distance);

    // Step 3 — Find best hospital
    const hospital = findBestHospital(patientLat, patientLng);
    const hospRoute = getBestRoute(
        getDistanceKm(patientLat, patientLng, hospital.lat, hospital.lng)
    );

    // Step 4 — Mark ambulance as dispatched
    const amb = ambulances.find((a) => a.id === ambulance.id);
    if (amb) amb.available = false;

    // Step 5 — Build response
    const result = {
        status: "dispatched",
        timestamp: new Date().toISOString(),
        patient: { name: patientName, lat: patientLat, lng: patientLng },
        emergency: emergencyType,
        ambulance: {
            id: ambulance.id,
            name: ambulance.name,
            driver: ambulance.driver,
            distanceKm: ambulance.distance.toFixed(2),
            eta: `${ambRoute.etaMinutes} mins`,
            route: ambRoute.via,
        },
        hospital: {
            id: hospital.id,
            name: hospital.name,
            erBeds: hospital.erCapacity,
            distanceKm: hospRoute.distanceKm,
            eta: `${hospRoute.etaMinutes} mins`,
        },
        actions: [
            `Ambulance ${ambulance.id} dispatched via ${ambRoute.via}`,
            `ETA to patient: ${ambRoute.etaMinutes} minutes`,
            `Routing to ${hospital.name} (${hospital.erCapacity} ER beds available)`,
            `Hospital pre-alerted: ${emergencyType} patient incoming`,
        ],
    };

    console.log("✅ DISPATCH RESULT:");
    console.log(JSON.stringify(result, null, 2));

    return result;
}

export { triggerNavigator, ambulances, hospitals };
