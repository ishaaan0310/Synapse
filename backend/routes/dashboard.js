const express = require('express');
const router = express.Router();

const AcademicGoal = require('../models/AcademicGoal');
const HealthMetric = require('../models/HealthMetrics');
const NutritionLog = require('../models/NutritionLog');
const Document = require('../models/Document');

const authMiddleware = require('../middleware/authMiddleware');

// GET DASHBOARD SUMMARY
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const [goals, healthLogs, meals, documents] = await Promise.all([
      AcademicGoal.countDocuments({ user: userId }),
      HealthMetric.countDocuments({ user: userId }),
      NutritionLog.countDocuments({ user: userId }),
      Document.countDocuments({ user: userId })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        goals,
        healthLogs,
        meals,
        documents
      }
    });

  } catch (error) {
    console.error('Dashboard Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data'
    });
  }
});

module.exports = router;