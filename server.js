require('dotenv').config();
const express = require('express');
const { run, client } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB first
run().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Database: ${process.env.DB_NAME}`);
  });
}).catch(err => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});

// Your routes here...
app.get('/', (req, res) => {
  res.send('Traverse Ethiopia API is running!');
});