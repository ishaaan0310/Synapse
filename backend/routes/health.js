const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const HealthMetric = require('../models/HealthMetrics');
const authMiddleware = require('../middleware/authMiddleware');

// ===============================
// SAVE HEALTH METRIC
// ===============================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      weight,
      sleepHours,
      steps,
      heartRate,
      sleepQuality,
      height,
      waterIntake,
      source,
      notes
    } = req.body;

    const metric = new HealthMetric({
      user: req.userId,
      weight,
      sleepHours,
      steps,
      heartRate,
      sleepQuality,
      height,
      waterIntake,
      source: source || 'manual',
      notes,
      date: new Date()
    });

    await metric.save();

    res.status(201).json({
      message: 'Health metric logged!',
      metric
    });
  } catch (error) {
    console.error('Health save error:', error);

    res.status(500).json({
      message: 'Failed to save health metric',
      error: error.message
    });
  }
});

// ===============================
// GET MY HEALTH LOGS
// ===============================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const metrics = await HealthMetric
      .find({ user: req.userId })
      .sort({ date: -1 });

    res.json(metrics);
  } catch (error) {
    console.error('Health fetch error:', error);

    res.status(500).json({
      message: 'Failed to fetch health logs',
      error: error.message
    });
  }
});

// ===============================
// HEALTH TRENDS AGGREGATION
// ===============================
router.get('/trends', authMiddleware, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [trends7Days, trends30Days] = await Promise.all([
      HealthMetric.aggregate([
        { $match: { user: userId, date: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: null,
            avgSleep: { $avg: '$sleepHours' },
            avgSteps: { $avg: '$steps' },
            avgHeartRate: { $avg: '$heartRate' },
            avgWater: { $avg: '$waterIntake' },
            totalLogs: { $sum: 1 }
          }
        }
      ]),
      HealthMetric.aggregate([
        { $match: { user: userId, date: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: null,
            avgSleep: { $avg: '$sleepHours' },
            avgSteps: { $avg: '$steps' },
            avgHeartRate: { $avg: '$heartRate' },
            avgWater: { $avg: '$waterIntake' },
            totalLogs: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      last7Days: trends7Days[0] ? {
        avgSleep: Number((trends7Days[0].avgSleep || 0).toFixed(1)),
        avgSteps: Math.round(trends7Days[0].avgSteps || 0),
        avgHeartRate: Math.round(trends7Days[0].avgHeartRate || 0),
        avgWater: Number((trends7Days[0].avgWater || 0).toFixed(1)),
        totalLogs: trends7Days[0].totalLogs
      } : null,
      last30Days: trends30Days[0] ? {
        avgSleep: Number((trends30Days[0].avgSleep || 0).toFixed(1)),
        avgSteps: Math.round(trends30Days[0].avgSteps || 0),
        avgHeartRate: Math.round(trends30Days[0].avgHeartRate || 0),
        avgWater: Number((trends30Days[0].avgWater || 0).toFixed(1)),
        totalLogs: trends30Days[0].totalLogs
      } : null
    });
  } catch (error) {
    console.error('Health trends error:', error);
    res.status(500).json({
      message: 'Failed to calculate health trends',
      error: error.message
    });
  }
});

// ===============================
// HEALTH ALERTS
// ===============================
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    const latest = await HealthMetric
      .findOne({ user: req.userId })
      .sort({ date: -1 });

    const alerts = [];

    if (latest) {
      if (latest.sleepHours && latest.sleepHours < 6) {
        alerts.push({ type: 'warning', text: `😴 Sleep duration (${latest.sleepHours}h) is below target of 6.0 hours.` });
      }

      if (latest.steps && latest.steps < 5000) {
        alerts.push({ type: 'warning', text: `🚶 Daily steps (${latest.steps.toLocaleString()}) are below active threshold of 5,000 steps.` });
      }

      if (latest.waterIntake && latest.waterIntake < 2) {
        alerts.push({ type: 'info', text: `💧 Water intake (${latest.waterIntake}L) is below recommended 2.0 liters.` });
      }

      if (latest.heartRate && latest.heartRate > 100) {
        alerts.push({ type: 'danger', text: `❤️ Elevated resting heart rate detected (${latest.heartRate} BPM).` });
      }
    }

    res.json({ alerts });
  } catch (error) {
    console.error('Health alerts error:', error);

    res.status(500).json({
      message: 'Failed to fetch health alerts',
      error: error.message
    });
  }
});

// ===============================
// WEARABLE DATA SYNC MOCK
// ===============================
router.post('/sync-wearable', authMiddleware, async (req, res) => {
  try {
    const { provider } = req.body; // 'fitbit' or 'healthkit'
    const source = provider === 'fitbit' ? 'fitbit' : 'healthkit';

    // Simulated data generation
    const mockSteps = Math.floor(Math.random() * 4000) + 6500; // 6500 - 10500
    const mockSleep = Number((Math.random() * 2.5 + 6.5).toFixed(1)); // 6.5 - 9.0 hrs
    const mockHeartRate = Math.floor(Math.random() * 15) + 62; // 62 - 77 BPM
    const mockWater = Number((Math.random() * 1.5 + 2.0).toFixed(1)); // 2.0 - 3.5 L
    const mockWeight = 70.0;
    const mockHeight = 175;

    const metric = new HealthMetric({
      user: req.userId,
      weight: mockWeight,
      height: mockHeight,
      sleepHours: mockSleep,
      sleepQuality: mockSleep >= 7.5 ? 'excellent' : 'good',
      steps: mockSteps,
      heartRate: mockHeartRate,
      waterIntake: mockWater,
      source,
      notes: `Automated sync from ${source === 'fitbit' ? 'Fitbit Wearable API' : 'Apple HealthKit'}`,
      date: new Date()
    });

    await metric.save();

    res.status(201).json({
      message: `Successfully synced data from ${source === 'fitbit' ? 'Fitbit' : 'Apple HealthKit'}!`,
      metric
    });
  } catch (error) {
    console.error('Wearable sync error:', error);
    res.status(500).json({
      message: 'Failed to sync wearable data',
      error: error.message
    });
  }
});
// ===============================
// CROSS-MODULE CORRELATION (Q7)
// ===============================
router.get('/cross-module-correlation', authMiddleware, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const correlation = await HealthMetric.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: { $week: "$date" },
          avgSleep: { $avg: "$sleepHours" },
          avgSteps: { $avg: "$steps" }
        }
      },
      {
        $lookup: {
          from: "academicgoals",
          localField: "_id",
          foreignField: "week",
          as: "goals"
        }
      }
    ]);

    res.json(correlation);
  } catch (error) {
    console.error('Cross-module correlation error:', error);
    res.status(500).json({
      message: 'Failed to calculate cross-module correlation',
      error: error.message
    });
  }
});

module.exports = router;