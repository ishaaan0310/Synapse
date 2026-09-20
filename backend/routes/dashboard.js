const express = require('express');
const router = express.Router();

const AcademicGoal = require('../models/AcademicGoal');
const HealthMetric = require('../models/HealthMetrics');
const NutritionLog = require('../models/NutritionLog');
const Document = require('../models/Document');
const User = require('../models/User');

const authMiddleware = require('../middleware/authMiddleware');

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
      NutritionLog.find({ user: userId, date: { $gte: startOfDay, $lte: endOfDay } }),
      User.findById(userId).select('nutritionGoals'),
      HealthMetric.find({ user: userId }).sort({ date: -1 }).limit(3),
      NutritionLog.find({ user: userId }).sort({ date: -1 }).limit(3)
    ]);

    // Calculate today's nutrition totals
    const todayNutritionTotals = todayMeals.reduce((acc, m) => {
      acc.calories += m.calories || 0;
      acc.protein += m.protein || 0;
      return acc;
    }, { calories: 0, protein: 0 });

    // Health alerts
    const alerts = [];
    if (latestHealth) {
      if (latestHealth.sleepHours && latestHealth.sleepHours < 6) {
        alerts.push({ type: 'warning', text: `😴 Sleep (${latestHealth.sleepHours}h) is below 6.0 hours.` });
      }
      if (latestHealth.steps && latestHealth.steps < 5000) {
        alerts.push({ type: 'warning', text: `🚶 Steps (${latestHealth.steps.toLocaleString()}) are below 5,000 threshold.` });
      }
      if (latestHealth.waterIntake && latestHealth.waterIntake < 2) {
        alerts.push({ type: 'info', text: `💧 Water intake (${latestHealth.waterIntake}L) is below 2.0 liters.` });
      }
    }

    res.json({
      goals,
      healthLogs: healthLogsCount,
      meals: mealsCount,
      documents: documentsCount,
      latestHealth: latestHealth || null,
      todayNutrition: {
        totals: todayNutritionTotals,
        goals: user?.nutritionGoals || { calories: 2000, protein: 100 }
      },
      alerts,
      recentActivity: {
        health: recentHealthLogs,
        meals: recentMealsList
      }
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