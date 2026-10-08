const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const HealthMetric = require('../models/HealthMetrics');
const authMiddleware = require('../middleware/authMiddleware');

// ==========================================
// VALIDATION HELPER
// Converts form values to numbers and checks realistic ranges.
// Returns { data } or { error }.
// ==========================================
const NUMERIC_FIELDS = {
  weight: { min: 1, max: 400, label: 'Weight (kg)' },
  height: { min: 30, max: 260, label: 'Height (cm)' },
  sleepHours: { min: 0, max: 24, label: 'Sleep hours' },
  steps: { min: 0, max: 150000, label: 'Steps' },
  heartRate: { min: 20, max: 250, label: 'Heart rate' },
  waterIntake: { min: 0, max: 15, label: 'Water intake (L)' }
};

const SLEEP_QUALITIES = ['poor', 'fair', 'good', 'excellent'];

const parseHealthInput = (body) => {
  const data = {};

  for (const [field, rule] of Object.entries(NUMERIC_FIELDS)) {
    const raw = body[field];
    if (raw === undefined || raw === null || raw === '') continue;

    const value = Number(raw);
    if (!Number.isFinite(value) || value < rule.min || value > rule.max) {
      return { error: `${rule.label} must be between ${rule.min} and ${rule.max}` };
    }
    data[field] = value;
  }

  if (body.sleepQuality) {
    if (!SLEEP_QUALITIES.includes(body.sleepQuality)) {
      return { error: 'Invalid sleep quality' };
    }
    data.sleepQuality = body.sleepQuality;
  }

  if (typeof body.notes === 'string') {
    data.notes = body.notes.trim().slice(0, 500);
  }

  if (body.date) {
    const date = new Date(body.date);
    if (Number.isNaN(date.getTime()) || date > new Date(Date.now() + 60 * 1000)) {
      return { error: 'Date cannot be in the future' };
    }
    data.date = date;
  }

  return { data };
};

// SAVE HEALTH METRIC
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = parseHealthInput(req.body);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const hasMetric = Object.keys(NUMERIC_FIELDS).some((f) => data[f] !== undefined);
    if (!hasMetric) {
      return res.status(400).json({
        success: false,
        message: 'Enter at least one metric'
      });
    }

    const metric = new HealthMetric({
      user: req.userId,
      ...data,
      source: 'manual',
      date: data.date || new Date()
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
    // Optional ?days=30 filter for charts
    const filter = { user: req.userId };
    const days = Number(req.query.days);
    if (Number.isFinite(days) && days > 0) {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - (days - 1));
      filter.date = { $gte: since };
    }

    const metrics = await HealthMetric
      .find(filter)
      .sort({ date: -1 })
      .limit(500);

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

// WEARABLE DATA SYNC (DEMO)
// Generates realistic sample data. Swap this for the real Fitbit /
// Apple HealthKit APIs once you have API credentials.
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

    // Re-use the user's last known weight/height instead of fixed values
    const lastBody = await HealthMetric
      .findOne({ user: req.userId, weight: { $ne: null } })
      .sort({ date: -1 });

    const metric = new HealthMetric({
      user: req.userId,
      weight: lastBody?.weight,
      height: lastBody?.height,
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

// UPDATE A HEALTH LOG
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { data, error } = parseHealthInput(req.body);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const metric = await HealthMetric.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!metric) {
      return res.status(404).json({ success: false, message: 'Health log not found' });
    }

    return res.json({ success: true, message: 'Health log updated', metric });
  } catch (error) {
    next(error);
  }
});

// DELETE A HEALTH LOG
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const metric = await HealthMetric.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });

    if (!metric) {
      return res.status(404).json({ success: false, message: 'Health log not found' });
    }

    return res.json({ success: true, message: 'Health log deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;