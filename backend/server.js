const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// ==========================================
// CONFIGURATION
// ==========================================

const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE
// ==========================================

// Allow the React dev server (or CLIENT_URL from .env) to call the API
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow tools like Postman (no origin) and listed origins
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');

      if (!origin || allowedOrigins.includes(origin) || isLocalhost) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  })
);

app.use(express.json({ limit: '1mb' }));

app.use(express.urlencoded({ extended: true }));

// NOTE: uploaded files are no longer served publicly from /uploads.
// They are streamed through GET /api/documents/:id/file, which checks
// that the logged-in user owns the document.

// Make sure the uploads folder exists (multer will not create it)
require('fs').mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

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
app.use('/api/profile', require('./routes/profile'));
app.use('/api/agent', require('./routes/agent'));

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
  console.error('Server Error:', err.message);

  // Multer upload errors (file too large, wrong type, ...)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message:
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File is too large (max 10 MB)'
          : err.message
    });
  }

  // Malformed ObjectId in a URL, e.g. /api/health/abc
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid id'
    });
  }

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
      console.log(
        process.env.GEMINI_API_KEY
          ? `AI agent: ON (Gemini ${process.env.GEMINI_MODEL || 'gemini-3.8-flash'})`
          : 'AI agent: OFF (add GEMINI_API_KEY to .env to enable)'
      );
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