require("dotenv").config();
const express = require("express");
const cors = require('cors'); // Install: npm install cors
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");
const postmark = require("postmark");

const app = express();
const PORT = 3001;

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      // "https://wedfrontend-gufez5zur-pierof9s-projects.vercel.app", // Replace with your actual Vercel URL
      "http://localhost:5173", // Allow localhost for local testing
      "https://matrimoniopieroeclaudia.vercel.app/",
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

// Use the CORS middleware
app.use(cors(corsOptions));

// Middleware for parsing JSON request bodies
app.use(bodyParser.json());

// Define the file path to store data
const filePath = path.join(__dirname, "./assets/replies.json");

// Postmark setup
const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

// I'll use the same mail for simplicity
const FROM_EMAIL = process.env.FROM_EMAIL;
const TO_EMAIL = process.env.TO_EMAIL;

// Handle form submissions
app.post("/submit", (req, res) => {
  const { name, surname, email, isComing, address, bringingSomeone, plusOneName, needCar, hasNotes, notes } = req.body;

  if (!name || !surname || !email) {
    return res.status(400).json({ error: "Name, Surname, and Email are required." });
  }

  // Create a new reply entry
  const newReply = { name, surname, email, isComing, address, bringingSomeone, plusOneName, needCar, hasNotes, notes };

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

      let MAIL_TEXT;
      if (isComing === "yes") {
        MAIL_TEXT = `
        <h1>You have another confirmation.</h1> 
        <p>${name} ${surname} will join the party!</p>
        <p>Best Regards,</p>
        `;
      } else {
        MAIL_TEXT = `
        <h1>Ops! They will not join.</h1> 
        <p>${name} ${surname} said he is not coming to the party.</p>
        <p>Best Regards,</p>
        `;
      };

      // Step 1: Send confirmation email to the guest
      const confirmationEmail = {
        From: FROM_EMAIL, // Your sender email
        To: TO_EMAIL,
        Subject: "RSVP Event Management",
        TextBody: MAIL_TEXT.replace(/<[^>]*>/g, ""), // Plain text version (strips HTML tags)
        HtmlBody: MAIL_TEXT,
        MessageStream: "outbound",
      };

      postmarkClient.sendEmail(confirmationEmail)
        .then(() => console.log("Confirmation email sent to guest."))
        .catch((err) => console.error("Error sending confirmation email:", err));

      // Step 2: Send summary email to yourself
      let totalComing = 0;
      let totalNotComing = 0;

      // Count the number of attendees
      replies.forEach((reply) => {
        if (reply.isComing === "yes") {
          totalComing++;
        } else if (reply.isComing === "no") {
          totalNotComing++;
        }
      });

      const summaryEmail = {
        From: FROM_EMAIL, // Your sender email
        To: TO_EMAIL, // Your email address
        Subject: "RSVP Summary Report",
        TextBody: `Total RSVPs:\n- People attending: ${totalComing}\n- People not attending: ${totalNotComing}\n\nAttached is the full list of replies.`,
        MessageStream: "outbound",
        Attachments: [
          {
            Name: "replies.json", // File name
            Content: fs.readFileSync(filePath).toString("base64"), // Base64-encoded file content
            ContentType: "application/json",
          },
        ],
      };

      postmarkClient.sendEmail(summaryEmail)
        .then(() => console.log("Summary email sent to admin."))
        .catch((err) => console.error("Error sending summary email:", err));

      // Respond to the client
      res.status(200).json({ message: "Reply saved and emails sent successfully!" });
    });
  });
});

// Handle fetching all replies and computing totals
app.get("/replies", (req, res) => {
  // Read the replies.json file
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      return res.status(500).json({ error: "Failed to read data." });
    }

    // Parse the data or use an empty array if the file doesn't exist or is empty
    const replies = data ? JSON.parse(data) : [];

    // Count "isComing: yes" and "isComing: no"
    const totals = replies.reduce(
      (acc, reply) => {
        if (reply.isComing === "yes") {
          acc.yes++;
        } else if (reply.isComing === "no") {
          acc.no++;
        }
        return acc;
      },
      { yes: 0, no: 0 } // Initialize counters
    );

    // Respond with the replies and totals
    res.status(200).json({ totals, replies });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});