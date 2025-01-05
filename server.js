const express = require("express");
const cors = require('cors'); // Install: npm install cors
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = 3001;

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://wedfrontend-bke40csab-pierof9s-projects.vercel.app/", // Replace with your actual Vercel URL
      "http://localhost:5173", // Allow localhost for local testing
    ];

    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      // Allow the origin if it's in the allowed list or if it's a local request (e.g., Postman or CURL)
      callback(null, true);
    } else {
      // Reject requests from unknown origins
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"], // Allow GET, POST, and OPTIONS methods
  allowedHeaders: ["Content-Type"], // Allow Content-Type header
  credentials: true, // Allow credentials (cookies, HTTP authentication)
};

// Middleware for parsing JSON request bodies
app.use(bodyParser.json());

// Define the file path to store data
const filePath = path.join(__dirname, "./assets/replies.json");

// Handle form submissions
app.post("/submit", (req, res) => {
  const { name, surname, email, isComing, bringingSomeone, plusOneName, needCar, hasNotes, notes } = req.body;

  if (!name || !surname || !email) {
    return res.status(400).json({ error: "Name, Surname, and Email are required." });
  }

  // Create a new reply entry
  const newReply = { name, surname, email, isComing, bringingSomeone, plusOneName, needCar, hasNotes, notes };

  // Read existing replies from the file
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      return res.status(500).json({ error: "Failed to read data." });
    }

    const replies = data ? JSON.parse(data) : [];
    replies.push(newReply);

    // Write updated replies back to the file
    fs.writeFile(filePath, JSON.stringify(replies, null, 2), (writeErr) => {
      if (writeErr) {
        return res.status(500).json({ error: "Failed to save reply." });
      }
      res.status(200).json({ message: "Reply saved successfully!" });
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});