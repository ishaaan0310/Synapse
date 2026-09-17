const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json());

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
// HEALTH CHECK
// ==========================================

app.get('/', (req, res) => {
  res.json({
    message: 'Synapse API Running',
    version: '1.0.0',
    status: 'active'
  });
});

// ==========================================
// START SERVER AFTER MONGODB CONNECTS
// ==========================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {

    console.log('🔄 Connecting to MongoDB...');

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });

    console.log('✅ MongoDB Connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 http://localhost:${PORT}`);
    });

  } catch (error) {

    console.error('❌ MongoDB Connection Failed');
    console.error(error.message);

    process.exit(1);
  }
};

startServer();