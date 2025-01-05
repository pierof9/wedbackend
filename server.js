const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = 3001;

// Middleware
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

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