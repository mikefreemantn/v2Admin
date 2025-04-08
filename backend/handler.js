const serverless = require("serverless-http");
const express = require("express");
const app = express();

app.use(express.json()); // Middleware to parse JSON bodies

// Example Route
app.get("/", (req, res, next) => {
  return res.status(200).json({
    message: "Hello from the OmniPanel Backend!",
    stage: process.env.STAGE || 'local', // Access environment variables
  });
});

// Add other routes here...
// app.use('/users', require('./routes/users'));
// app.use('/logs', require('./routes/logs'));

// Error handling middleware (optional but recommended)
app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});


module.exports.handler = serverless(app);
