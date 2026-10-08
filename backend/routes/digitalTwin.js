const express = require('express');
const router = express.Router();

const DigitalTwinProfile = require('../models/DigitalTwinProfile');
const authMiddleware = require('../middleware/authMiddleware');
const { buildInsights } = require('../utils/insights');

// All digital twin routes require login. The profile always belongs to
// the logged-in user. (Previously /:userId let anyone read any profile.)
router.use(authMiddleware);

// ==========================================
// GET (AND REFRESH) MY DIGITAL TWIN
// ==========================================

router.get('/', async (req, res, next) => {
  try {
    const insights = await buildInsights(req.userId);

    const existing = await DigitalTwinProfile.findOne({ user: req.userId });

    // Keep recommendations the user already dismissed hidden
    const dismissed = new Set(
      (existing?.recommendations || [])
        .filter((r) => r.dismissed)
        .map((r) => r.message)
    );

    const recommendations = insights.recommendations.map((r) => ({
      ...r,
      dismissed: dismissed.has(r.message)
    }));

    const profile = await DigitalTwinProfile.findOneAndUpdate(
      { user: req.userId },
      {
        $set: {
          healthSummary: {
            avgSleep: insights.health.avgSleep7,
            avgSteps: insights.health.avgSteps7,
            weightTrend: insights.health.weightTrend,
            lastUpdated: new Date()
          },
          nutritionSummary: {
            avgDailyCalories: insights.nutrition.avgDailyCalories,
            preferredMeals: insights.nutrition.favouriteFoods
          },
          academicSummary: {
            completedGoals: insights.academic.completed,
            pendingGoals: insights.academic.active,
            avgProgress: insights.academic.avgProgress,
            riskGoals: insights.academic.riskGoalIds
          },
          recommendations,
          lastSynced: new Date()
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      profile,
      wellnessScore: insights.wellnessScore,
      scoreBreakdown: insights.scoreBreakdown,
      streak: insights.streak
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DISMISS A RECOMMENDATION
// ==========================================

router.patch('/recommendations/:recId/dismiss', async (req, res, next) => {
  try {
    const profile = await DigitalTwinProfile.findOneAndUpdate(
      { user: req.userId, 'recommendations._id': req.params.recId },
      { $set: { 'recommendations.$.dismissed': true } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Recommendation not found' });
    }

    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
