const express = require('express');
const router = express.Router();

const AcademicGoal = require('../models/AcademicGoal');
const HealthMetric = require('../models/HealthMetrics');
const NutritionLog = require('../models/NutritionLog');
const Document = require('../models/Document');
const User = require('../models/User');

const authMiddleware = require('../middleware/authMiddleware');

// GET DASHBOARD SUMMARY
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [
      goals,
      healthLogsCount,
      mealsCount,
      documentsCount,
      latestHealth,
      todayMeals,
      user,
      recentHealthLogs,
      recentMealsList
    ] = await Promise.all([
      AcademicGoal.countDocuments({ user: userId }),
      HealthMetric.countDocuments({ user: userId }),
      NutritionLog.countDocuments({ user: userId }),
      Document.countDocuments({ user: userId }),
      HealthMetric.findOne({ user: userId }).sort({ date: -1 }),
      NutritionLog.find({
        user: userId,
        date: { $gte: startOfDay, $lte: endOfDay }
      }),
      User.findById(userId).select('nutritionGoals'),
      HealthMetric.find({ user: userId })
        .sort({ date: -1 })
        .limit(3),
      NutritionLog.find({ user: userId })
        .sort({ date: -1 })
        .limit(3)
    ]);

    const todayNutritionTotals = todayMeals.reduce(
      (acc, meal) => {
        acc.calories += meal.calories || 0;
        acc.protein += meal.protein || 0;
        return acc;
      },
      { calories: 0, protein: 0 }
    );

    const alerts = [];

    if (latestHealth) {
      if (latestHealth.sleepHours && latestHealth.sleepHours < 6) {
        alerts.push({
          type: 'warning',
          text: `😴 Sleep (${latestHealth.sleepHours}h) is below 6.0 hours.`
        });
      }

      if (latestHealth.steps && latestHealth.steps < 5000) {
        alerts.push({
          type: 'warning',
          text: `🚶 Steps (${latestHealth.steps.toLocaleString()}) are below 5,000 threshold.`
        });
      }

      if (latestHealth.waterIntake && latestHealth.waterIntake < 2) {
        alerts.push({
          type: 'info',
          text: `💧 Water intake (${latestHealth.waterIntake}L) is below 2.0 liters.`
        });
      }
    }

    return res.status(200).json({
      success: true,
      goals,
      healthLogs: healthLogsCount,
      meals: mealsCount,
      documents: documentsCount,
      latestHealth: latestHealth || null,
      todayNutrition: {
        totals: todayNutritionTotals,
        goals: user?.nutritionGoals || {
          calories: 2000,
          protein: 100
        }
      },
      alerts,
      recentActivity: {
        health: recentHealthLogs,
        meals: recentMealsList
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