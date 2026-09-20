const express = require('express');
const router = express.Router();

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
          message: 'Your sleep duration is below 6 hours.'
        });
      }

      if (latest.steps && latest.steps < 5000) {
        alerts.push({
          type: 'warning',
          message: 'Your daily steps are below 5,000.'
        });
      }

      if (latest.waterIntake && latest.waterIntake < 2) {
        alerts.push({
          type: 'info',
          message: 'Your water intake is below 2 liters.'
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

module.exports = router;