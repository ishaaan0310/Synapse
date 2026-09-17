const express = require('express');
const router = express.Router();

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
        alerts.push('Your sleep duration is below 6 hours.');
      }

      if (latest.steps && latest.steps < 5000) {
        alerts.push('Your daily steps are below 5,000.');
      }

      if (latest.waterIntake && latest.waterIntake < 2) {
        alerts.push('Your water intake is below 2 liters.');
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

module.exports = router;