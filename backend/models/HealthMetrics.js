const mongoose = require('mongoose');

const healthMetricSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  weight: Number,
  height: Number,
  sleepHours: Number,
  sleepQuality: { type: String, enum: ['poor', 'fair', 'good', 'excellent'] },
  steps: Number,
  heartRate: Number,
  waterIntake: Number, // in ml
  notes: String
});

// Index for time-series queries
healthMetricSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('HealthMetric', healthMetricSchema);