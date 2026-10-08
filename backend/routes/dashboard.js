const express = require('express');
const router = express.Router();

const AcademicGoal = require('../models/AcademicGoal');
const HealthMetric = require('../models/HealthMetrics');
const NutritionLog = require('../models/NutritionLog');
const Document = require('../models/Document');

const authMiddleware = require('../middleware/authMiddleware');
const { buildInsights } = require('../utils/insights');

// GET DASHBOARD SUMMARY
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const [
      insights,
      goals,
      healthLogsCount,
      mealsCount,
      documentsCount,
      recentHealthLogs,
      recentMealsList
    ] = await Promise.all([
      buildInsights(userId),
      AcademicGoal.countDocuments({ user: userId }),
      HealthMetric.countDocuments({ user: userId }),
      NutritionLog.countDocuments({ user: userId }),
      Document.countDocuments({ user: userId }),
      HealthMetric.find({ user: userId }).sort({ date: -1 }).limit(3),
      NutritionLog.find({ user: userId }).sort({ date: -1 }).limit(3)
    ]);

    const latestHealth = insights.health.latest;
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
          text: `🚶 Steps (${latestHealth.steps.toLocaleString()}) are below the 5,000 threshold.`
        });
      }

      if (latestHealth.waterIntake && latestHealth.waterIntake < 2) {
        alerts.push({
          type: 'info',
          text: `💧 Water intake (${latestHealth.waterIntake}L) is below 2.0 litres.`
        });
      }

      if (latestHealth.heartRate && latestHealth.heartRate > 100) {
        alerts.push({
          type: 'danger',
          text: `❤️ Elevated resting heart rate (${latestHealth.heartRate} BPM).`
        });
      }
    }

    if (insights.academic.overdue > 0) {
      alerts.push({
        type: 'danger',
        text: `📚 ${insights.academic.overdue} academic goal(s) are overdue.`
      });
    }

    insights.documents.expiringSoon.slice(0, 2).forEach((doc) => {
      alerts.push({
        type: 'info',
        text: `📄 "${doc.title}" expires in ${doc.daysLeft} day(s).`
      });
    });

    return res.status(200).json({
      success: true,

      // Counts (kept for backwards compatibility)
      goals,
      healthLogs: healthLogsCount,
      meals: mealsCount,
      documents: documentsCount,

      latestHealth: latestHealth || null,

      todayNutrition: {
        totals: insights.nutrition.today,
        goals: insights.nutrition.goals
      },

      alerts,

      recentActivity: {
        health: recentHealthLogs,
        meals: recentMealsList
      },

      // New insight data
      wellnessScore: insights.wellnessScore,
      scoreBreakdown: insights.scoreBreakdown,
      streak: insights.streak,
      healthAverages: {
        sleep: insights.health.avgSleep7,
        steps: insights.health.avgSteps7,
        water: insights.health.avgWater7,
        weightTrend: insights.health.weightTrend
      },
      academic: {
        active: insights.academic.active,
        completed: insights.academic.completed,
        overdue: insights.academic.overdue,
        atRisk: insights.academic.atRisk,
        avgProgress: insights.academic.avgProgress,
        upcomingDeadlines: insights.academic.upcomingDeadlines
      },
      expiringDocuments: insights.documents.expiringSoon,
      recommendations: insights.recommendations
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
