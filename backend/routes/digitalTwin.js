const express = require('express');
const router = express.Router();
const DigitalTwinProfile = require('../models/DigitalTwinProfile');
const HealthMetric = require('../models/HealthMetrics');
const AcademicGoal = require('../models/AcademicGoal');
const NutritionLog = require('../models/NutritionLog');

// Get or create digital twin profile
router.get('/:userId', async (req, res) => {
  try {
    let profile = await DigitalTwinProfile.findOne({ user: req.params.userId });
    
    if (!profile) {
      // Calculate aggregates
      const healthMetrics = await HealthMetric.find({ user: req.params.userId }).sort({ date: -1 }).limit(30);
      const goals = await AcademicGoal.find({ user: req.params.userId });
      const nutritionLogs = await NutritionLog.find({ user: req.params.userId }).sort({ date: -1 }).limit(30);

      const avgSleep = healthMetrics.reduce((s, m) => s + (m.sleepHours || 0), 0) / (healthMetrics.length || 1);
      const avgSteps = healthMetrics.reduce((s, m) => s + (m.steps || 0), 0) / (healthMetrics.length || 1);
      const avgCalories = nutritionLogs.reduce((s, m) => s + (m.calories || 0), 0) / (nutritionLogs.length || 1);
      
      const pendingGoals = goals.filter(g => g.status !== 'completed').length;
      const riskGoals = goals.filter(g => {
        const daysLeft = (g.deadline - new Date()) / (1000 * 60 * 60 * 24);
        return daysLeft < 7 && g.progress < 50;
      }).map(g => g._id);

      profile = new DigitalTwinProfile({
        user: req.params.userId,
        healthSummary: { avgSleep, avgSteps, lastUpdated: new Date() },
        nutritionSummary: { avgDailyCalories: avgCalories },
        academicSummary: { 
          completedGoals: goals.filter(g => g.status === 'completed').length,
          pendingGoals,
          avgProgress: goals.reduce((s, g) => s + g.progress, 0) / (goals.length || 1),
          riskGoals
        },
        recommendations: generateRecommendations(avgSleep, pendingGoals, riskGoals)
      });
      await profile.save();
    }

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function generateRecommendations(avgSleep, pendingGoals, riskGoals) {
  const recs = [];
  if (avgSleep < 6) recs.push({ module: 'health', message: 'Increase sleep to improve focus', priority: 'high' });
  if (pendingGoals > 5) recs.push({ module: 'academic', message: 'You have many pending goals. Prioritize high-impact tasks.', priority: 'medium' });
  if (riskGoals.length > 0) recs.push({ module: 'academic', message: `${riskGoals.length} goals are at risk. Review your schedule.`, priority: 'high' });
  return recs;
}

module.exports = router;