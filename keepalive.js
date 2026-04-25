const https = require("https");

function keepAlive(url) {
  setInterval(() => {
    https.get(url, (res) => {
      console.log(`Keep-alive ping: ${res.statusCode}`);
    }).on("error", (err) => {
      console.log("Ping failed:", err.message);
    });
  }, 10 * 60 * 1000); // har 10 minute mein ping
}

module.exports = keepAlive;