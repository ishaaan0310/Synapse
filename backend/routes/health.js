const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const HealthMetric = require('../models/HealthMetrics');
const authMiddleware = require('../middleware/authMiddleware');

// SAVE HEALTH METRIC
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

    return res.status(201).json({
      success: true,
      message: 'Health metric logged successfully',
      metric
    });

  } catch (error) {
    console.error('Health Save Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to save health metric'
    });
  }
});

// GET MY HEALTH LOGS
router.get('/', authMiddleware, async (req, res) => {
  try {
    const metrics = await HealthMetric
      .find({ user: req.userId })
      .sort({ date: -1 });

    return res.status(200).json({
      success: true,
      count: metrics.length,
      metrics
    });

  } catch (error) {
    console.error('Health Fetch Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch health logs'
    });
  }
});

// HEALTH TRENDS
router.get('/trends', authMiddleware, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [trends7Days, trends30Days] = await Promise.all([
      HealthMetric.aggregate([
        {
          $match: {
            user: userId,
            date: { $gte: sevenDaysAgo }
          }
        },
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
        {
          $match: {
            user: userId,
            date: { $gte: thirtyDaysAgo }
          }
        },
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

    const formatTrend = (trend) => {
      if (!trend) return null;

      return {
        avgSleep: Number((trend.avgSleep || 0).toFixed(1)),
        avgSteps: Math.round(trend.avgSteps || 0),
        avgHeartRate: Math.round(trend.avgHeartRate || 0),
        avgWater: Number((trend.avgWater || 0).toFixed(1)),
        totalLogs: trend.totalLogs
      };
    };

    return res.status(200).json({
      success: true,
      last7Days: formatTrend(trends7Days[0]),
      last30Days: formatTrend(trends30Days[0])
    });

  } catch (error) {
    console.error('Health Trends Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to calculate health trends'
    });
  }
});

// HEALTH ALERTS
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    const latest = await HealthMetric
      .findOne({ user: req.userId })
      .sort({ date: -1 });

    const alerts = [];

    if (latest) {
      if (latest.sleepHours && latest.sleepHours < 6) {
        alerts.push({
          type: 'warning',
          text: `😴 Sleep duration (${latest.sleepHours}h) is below target of 6.0 hours.`
        });
      }

      if (latest.steps && latest.steps < 5000) {
        alerts.push({
          type: 'warning',
          text: `🚶 Daily steps (${latest.steps.toLocaleString()}) are below active threshold of 5,000 steps.`
        });
      }

      if (latest.waterIntake && latest.waterIntake < 2) {
        alerts.push({
          type: 'info',
          text: `💧 Water intake (${latest.waterIntake}L) is below recommended 2.0 liters.`
        });
      }

      if (latest.heartRate && latest.heartRate > 100) {
        alerts.push({
          type: 'danger',
          text: `❤️ Elevated resting heart rate detected (${latest.heartRate} BPM).`
        });
      }
    }

    return res.status(200).json({
      success: true,
      alerts
    });

  } catch (error) {
    console.error('Health Alerts Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch health alerts'
    });
  }
});

// WEARABLE DATA SYNC MOCK
router.post('/sync-wearable', authMiddleware, async (req, res) => {
  try {
    const { provider } = req.body;

    const source = provider === 'fitbit'
      ? 'fitbit'
      : 'healthkit';

    const mockSteps = Math.floor(Math.random() * 4000) + 6500;
    const mockSleep = Number(
      (Math.random() * 2.5 + 6.5).toFixed(1)
    );
    const mockHeartRate = Math.floor(Math.random() * 15) + 62;
    const mockWater = Number(
      (Math.random() * 1.5 + 2.0).toFixed(1)
    );

    const metric = new HealthMetric({
      user: req.userId,
      weight: 70.0,
      height: 175,
      sleepHours: mockSleep,
      sleepQuality: mockSleep >= 7.5 ? 'excellent' : 'good',
      steps: mockSteps,
      heartRate: mockHeartRate,
      waterIntake: mockWater,
      source,
      notes: `Automated sync from ${
        source === 'fitbit'
          ? 'Fitbit Wearable API'
          : 'Apple HealthKit'
      }`,
      date: new Date()
    });

    await metric.save();

    return res.status(201).json({
      success: true,
      message: `Successfully synced data from ${
        source === 'fitbit'
          ? 'Fitbit'
          : 'Apple HealthKit'
      }`,
      metric
    });

  } catch (error) {
    console.error('Wearable Sync Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to sync wearable data'
    });
  }
});

// CROSS-MODULE CORRELATION
router.get('/cross-module-correlation', authMiddleware, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const correlation = await HealthMetric.aggregate([
      {
        $match: {
          user: userId
        }
      },
      {
        $group: {
          _id: { $week: '$date' },
          avgSleep: { $avg: '$sleepHours' },
          avgSteps: { $avg: '$steps' }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      correlation
    });

  } catch (error) {
    console.error('Cross-module Correlation Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to calculate cross-module correlation'
    });
  }
});

module.exports = router;