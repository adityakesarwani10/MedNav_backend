// db.js — mock database (replace with MongoDB/PostgreSQL in production)

const users = [
  {
    id: "USR-001",
    name: "Demo User",
    phone: "+919876543210",
    role: "user",
    verified: true,
    createdAt: "2024-01-01"
  },
  {
    id: "ADM-001",
    name: "Admin",
    phone: "+919999999999",
    role: "admin",
    verified: true,
    createdAt: "2024-01-01"
  }
];

const otpStore = {};   // { phone: { otp, expires } }
const sessions = {};   // { token: userId }

const calls = [];      // call history

const ambulances = [
  { id: "AMB-01", plate: "MH-01-AB-1234", driver: "Rajan Singh",  phone: "+91XXXXXXXXXX", available: true,  status: "available",   hospital: "City General Hospital" },
  { id: "AMB-02", plate: "DL-02-CD-5678", driver: "Amit Singh",   phone: "+91XXXXXXXXXX", available: false, status: "on_trip",     hospital: "Apollo Medical Center" },
  { id: "AMB-03", plate: "KA-03-EF-9012", driver: "Suresh Patil", phone: "+91XXXXXXXXXX", available: true,  status: "available",   hospital: "City General Hospital" },
  { id: "AMB-04", plate: "MH-04-GH-3456", driver: "Vikram Joshi", phone: "+91XXXXXXXXXX", available: false, status: "maintenance", hospital: "Ram Manohar Lohia" },
  { id: "AMB-05", plate: "TN-05-IJ-7890", driver: "Karthik Rajan",phone: "+91XXXXXXXXXX", available: false, status: "on_trip",     hospital: "Apollo Medical Center" },
];

const hospitals = [
  { id: "HOSP-01", name: "City General Hospital",   erBeds: 8,  totalBeds: 20, available: true,  address: "Civil Lines, Prayagraj",   phone: "+91XXXXXXXXXX" },
  { id: "HOSP-02", name: "Apollo Medical Center",   erBeds: 3,  totalBeds: 15, available: true,  address: "Naini, Prayagraj",          phone: "+91XXXXXXXXXX" },
  { id: "HOSP-03", name: "Ram Manohar Lohia",       erBeds: 12, totalBeds: 40, available: true,  address: "George Town, Prayagraj",   phone: "+91XXXXXXXXXX" },
  { id: "HOSP-04", name: "Green Valley Hospital",   erBeds: 0,  totalBeds: 10, available: false, address: "Lukerganj, Prayagraj",     phone: "+91XXXXXXXXXX" },
];

module.exports = { users, otpStore, sessions, calls, ambulances, hospitals };