const express = require('express');
const router = express.Router();

const AcademicGoal = require('../models/AcademicGoal');
const HealthMetric = require('../models/HealthMetrics');
const NutritionLog = require('../models/NutritionLog');
const Document = require('../models/Document');

const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const [
      goals,
      healthLogs,
      meals,
      documents
    ] = await Promise.all([
      AcademicGoal.countDocuments({ user: userId }),
      HealthMetric.countDocuments({ user: userId }),
      NutritionLog.countDocuments({ user: userId }),
      Document.countDocuments({ user: userId })
    ]);

    res.json({
      goals,
      healthLogs,
      meals,
      documents
    });

  } catch (error) {
    console.error('Dashboard error:', error);

    res.status(500).json({
      message: 'Failed to load dashboard',
      error: error.message
    });
  }
});

module.exports = router;