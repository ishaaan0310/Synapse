const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ==========================================
// CONFIGURATION
// ==========================================

const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// ==========================================
// ROUTES
// ==========================================

app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/health', require('./routes/health'));
app.use('/api/nutrition', require('./routes/nutrition'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/academic', require('./routes/academic'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/digital-twin', require('./routes/digitalTwin'));

// ==========================================
// ROOT HEALTH CHECK
// ==========================================

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Synapse API Running',
    version: '1.0.0',
    status: 'active'
  });
});

// ==========================================
// API HEALTH CHECK
// ==========================================

app.get('/api/health-check', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Synapse API',
    database:
      mongoose.connection.readyState === 1
        ? 'connected'
        : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  console.error('Server Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ==========================================
// MONGODB CONNECTION
// ==========================================

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env');
    }

    console.log('Connecting to MongoDB...');

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });

    console.log('MongoDB Connected');

    app.listen(PORT, () => {
      console.log(`Synapse API running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('MongoDB Connection Failed');
    console.error(error.message);

    process.exit(1);
  }
};

// ==========================================
// PROCESS ERROR HANDLING
// ==========================================

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// ==========================================
// START APPLICATION
// ==========================================

startServer();