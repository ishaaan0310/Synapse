const mongoose = require('mongoose');

const digitalTwinProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  // Aggregated insights
  healthSummary: {
    avgSleep: Number,
    avgSteps: Number,
    weightTrend: String, // 'increasing', 'decreasing', 'stable'
    lastUpdated: Date
  },
  nutritionSummary: {
    avgDailyCalories: Number,
    preferredMeals: [String],
    dietaryPattern: String
  },
  academicSummary: {
    completedGoals: Number,
    pendingGoals: Number,
    avgProgress: Number,
    riskGoals: [mongoose.Schema.Types.ObjectId] // goals at risk
  },
  // AI-generated recommendations
  recommendations: [{
    module: String,
    message: String,
    priority: { type: String, enum: ['low', 'medium', 'high'] },
    dismissed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  lastSynced: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DigitalTwinProfile', digitalTwinProfileSchema);