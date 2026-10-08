// ==========================================
// SHARED INSIGHT ENGINE
// Used by the dashboard, digital twin and AI chat so all three
// describe the user the same way.
// ==========================================

const HealthMetric = require('../models/HealthMetrics');
const NutritionLog = require('../models/NutritionLog');
const AcademicGoal = require('../models/AcademicGoal');
const Document = require('../models/Document');
const User = require('../models/User');

const DAY_MS = 1000 * 60 * 60 * 24;

const TARGETS = {
  sleepMin: 7,
  sleepMax: 9,
  steps: 8000,
  water: 2.5 // litres
};

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const avg = (items, key) => {
  const values = items
    .map((item) => item[key])
    .filter((v) => typeof v === 'number' && !Number.isNaN(v));

  if (values.length === 0) return null;

  return values.reduce((s, v) => s + v, 0) / values.length;
};

const round = (value, digits = 1) =>
  value === null || value === undefined
    ? null
    : Number(value.toFixed(digits));

// Clamp helper for 0..100 scores
const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

// ------------------------------------------
// Academic goal helpers
// ------------------------------------------

const daysLeft = (deadline) =>
  Math.ceil((startOfDay(deadline) - startOfDay()) / DAY_MS);

const isAtRisk = (goal) => {
  if (goal.status === 'completed') return false;
  const left = daysLeft(goal.deadline);
  return left >= 0 && left < 7 && goal.progress < 50;
};

// Mark goals whose deadline has passed as overdue (and un-mark if the
// deadline was moved into the future). Returns the number changed.
const refreshOverdueGoals = async (userId) => {
  const today = startOfDay();

  const [overdue, revivedStarted, revivedNew] = await Promise.all([
    AcademicGoal.updateMany(
      {
        user: userId,
        status: { $in: ['not-started', 'in-progress'] },
        deadline: { $lt: today }
      },
      { $set: { status: 'overdue' } }
    ),
    AcademicGoal.updateMany(
      { user: userId, status: 'overdue', deadline: { $gte: today }, progress: { $gt: 0 } },
      { $set: { status: 'in-progress' } }
    ),
    AcademicGoal.updateMany(
      { user: userId, status: 'overdue', deadline: { $gte: today }, progress: { $lte: 0 } },
      { $set: { status: 'not-started' } }
    )
  ]);

  return (
    (overdue.modifiedCount || 0) +
    (revivedStarted.modifiedCount || 0) +
    (revivedNew.modifiedCount || 0)
  );
};

// ------------------------------------------
// Logging streak: consecutive days (ending today or yesterday)
// with at least one health or meal entry
// ------------------------------------------

const computeStreak = (dates) => {
  const days = new Set(dates.map((d) => startOfDay(d).getTime()));

  let cursor = startOfDay();
  if (!days.has(cursor.getTime())) {
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  let streak = 0;
  while (days.has(cursor.getTime())) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  return streak;
};

// ------------------------------------------
// Wellness score (0-100) from whatever data exists
// ------------------------------------------

const scoreSleep = (hours) => {
  if (hours === null) return null;
  if (hours >= TARGETS.sleepMin && hours <= TARGETS.sleepMax) return 100;
  const gap = hours < TARGETS.sleepMin
    ? TARGETS.sleepMin - hours
    : hours - TARGETS.sleepMax;
  return clampScore(100 - gap * 25);
};

const scoreSteps = (steps) =>
  steps === null ? null : clampScore((steps / TARGETS.steps) * 100);

const scoreWater = (litres) =>
  litres === null ? null : clampScore((litres / TARGETS.water) * 100);

const scoreNutrition = (calories, goal) => {
  if (!calories || !goal) return null;
  const ratio = calories / goal;
  // Within ±10% of goal is perfect, then falls off
  const off = Math.max(0, Math.abs(1 - ratio) - 0.1);
  return clampScore(100 - off * 150);
};

const scoreAcademic = (goals) => {
  const active = goals.filter((g) => g.status !== 'completed');
  if (goals.length === 0) return null;
  if (active.length === 0) return 100;
  const overdue = active.filter((g) => g.status === 'overdue').length;
  const risk = active.filter(isAtRisk).length;
  return clampScore(100 - overdue * 25 - risk * 15);
};

// ------------------------------------------
// MAIN: build the full picture for a user
// ------------------------------------------

const buildInsights = async (userId) => {
  await refreshOverdueGoals(userId);

  const today = startOfDay();
  const sevenDaysAgo = new Date(today.getTime() - 6 * DAY_MS);
  const thirtyDaysAgo = new Date(today.getTime() - 29 * DAY_MS);
  const thirtyDaysAhead = new Date(today.getTime() + 30 * DAY_MS);

  const [user, health30, meals30, goals, expiringDocs] = await Promise.all([
    User.findById(userId).select('name nutritionGoals'),
    HealthMetric.find({ user: userId, date: { $gte: thirtyDaysAgo } }).sort({ date: -1 }),
    NutritionLog.find({ user: userId, date: { $gte: thirtyDaysAgo } }).sort({ date: -1 }),
    AcademicGoal.find({ user: userId }).sort({ deadline: 1 }),
    Document.find({
      user: userId,
      expiryDate: { $gte: today, $lte: thirtyDaysAhead }
    }).sort({ expiryDate: 1 })
  ]);

  const nutritionGoals = {
    calories: user?.nutritionGoals?.calories || 2000,
    protein: user?.nutritionGoals?.protein || 100,
    carbs: user?.nutritionGoals?.carbs || 250,
    fat: user?.nutritionGoals?.fat || 70
  };

  const latestHealth = health30[0] || null;
  const health7 = health30.filter((h) => h.date >= sevenDaysAgo);

  // Weight trend: compare oldest vs newest weight in the 30-day window
  const weights = health30.filter((h) => typeof h.weight === 'number');
  let weightTrend = 'not enough data';
  let weightChange = null;
  if (weights.length >= 2) {
    weightChange = round(weights[0].weight - weights[weights.length - 1].weight, 1);
    weightTrend = Math.abs(weightChange) < 0.5
      ? 'stable'
      : weightChange > 0 ? 'increasing' : 'decreasing';
  }

  // Nutrition: today + 7-day daily averages
  const todayMeals = meals30.filter((m) => m.date >= today);
  const todayTotals = todayMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fat: acc.fat + (m.fat || 0)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const meals7 = meals30.filter((m) => m.date >= sevenDaysAgo);
  const mealDays = new Set(meals7.map((m) => startOfDay(m.date).getTime()));
  const avgDailyCalories = mealDays.size
    ? Math.round(meals7.reduce((s, m) => s + (m.calories || 0), 0) / mealDays.size)
    : null;

  // Most frequently logged foods
  const foodCounts = {};
  meals30.forEach((m) => {
    const key = m.foodName.trim().toLowerCase();
    foodCounts[key] = (foodCounts[key] || 0) + 1;
  });
  const favouriteFoods = Object.entries(foodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  // Academic
  const activeGoals = goals.filter((g) => g.status !== 'completed');
  const completedGoals = goals.length - activeGoals.length;
  const overdueGoals = activeGoals.filter((g) => g.status === 'overdue');
  const riskGoals = activeGoals.filter(isAtRisk);
  const upcomingDeadlines = activeGoals
    .filter((g) => daysLeft(g.deadline) >= 0)
    .slice(0, 5)
    .map((g) => ({
      _id: g._id,
      title: g.title,
      category: g.category,
      priority: g.priority,
      progress: g.progress,
      deadline: g.deadline,
      daysLeft: daysLeft(g.deadline),
      atRisk: isAtRisk(g)
    }));

  // Averages
  const avgSleep7 = avg(health7, 'sleepHours');
  const avgSteps7 = avg(health7, 'steps');
  const avgWater7 = avg(health7, 'waterIntake');

  // Score components (use latest entry for "today" feel, fall back to averages)
  const components = {
    sleep: scoreSleep(latestHealth?.sleepHours ?? avgSleep7),
    activity: scoreSteps(latestHealth?.steps ?? avgSteps7),
    hydration: scoreWater(latestHealth?.waterIntake ?? avgWater7),
    nutrition: scoreNutrition(todayTotals.calories || avgDailyCalories, nutritionGoals.calories),
    academic: scoreAcademic(goals)
  };

  const available = Object.values(components).filter((v) => v !== null);
  const wellnessScore = available.length
    ? clampScore(available.reduce((s, v) => s + v, 0) / available.length)
    : null;

  const streak = computeStreak([
    ...health30.map((h) => h.date),
    ...meals30.map((m) => m.date)
  ]);

  // Recommendations
  const recommendations = [];
  const add = (module, priority, message) =>
    recommendations.push({ module, priority, message });

  if (!latestHealth) {
    add('health', 'medium', 'Log your first health metric so your twin can learn your baseline.');
  } else {
    if (avgSleep7 !== null && avgSleep7 < 6) {
      add('health', 'high', `You've averaged ${round(avgSleep7)}h of sleep this week. Aim for 7–9h to improve focus and memory.`);
    }
    if (avgSteps7 !== null && avgSteps7 < 5000) {
      add('health', 'medium', `Your average is ${Math.round(avgSteps7).toLocaleString()} steps/day. A 20-minute walk adds roughly 2,000 steps.`);
    }
    if (avgWater7 !== null && avgWater7 < 2) {
      add('health', 'medium', `Hydration is low (${round(avgWater7)}L/day). Keep a bottle at your desk.`);
    }
    if (latestHealth.heartRate && latestHealth.heartRate > 100) {
      add('health', 'high', `Your last resting heart rate was ${latestHealth.heartRate} BPM. If it stays above 100, consider checking with a doctor.`);
    }
  }

  if (todayMeals.length === 0) {
    add('nutrition', 'low', 'No meals logged today yet. Logging consistently makes your nutrition insights accurate.');
  } else if (todayTotals.protein < nutritionGoals.protein * 0.5 && new Date().getHours() >= 17) {
    add('nutrition', 'medium', `You're at ${Math.round(todayTotals.protein)}g of your ${nutritionGoals.protein}g protein goal. Add a protein-rich dinner.`);
  }

  if (overdueGoals.length > 0) {
    add('academic', 'high', `${overdueGoals.length} goal(s) are overdue. Update their deadlines or mark them complete.`);
  }
  if (riskGoals.length > 0) {
    add('academic', 'high', `${riskGoals.length} goal(s) are due within a week and under 50% done: ${riskGoals.map((g) => g.title).slice(0, 2).join(', ')}.`);
  }
  if (activeGoals.length > 5) {
    add('academic', 'medium', `You have ${activeGoals.length} active goals. Focus on the high-priority ones first.`);
  }
  if (avgSleep7 !== null && avgSleep7 < 6 && riskGoals.length > 0) {
    add('general', 'high', 'Low sleep plus close deadlines is a burnout risk. Protect your sleep. Tired study sessions are less effective.');
  }

  if (expiringDocs.length > 0) {
    add('document', 'medium', `${expiringDocs.length} document(s) expire within 30 days, starting with "${expiringDocs[0].title}".`);
  }

  return {
    user: user ? { name: user.name } : null,
    wellnessScore,
    scoreBreakdown: components,
    streak,
    health: {
      latest: latestHealth,
      avgSleep7: round(avgSleep7),
      avgSteps7: avgSteps7 === null ? null : Math.round(avgSteps7),
      avgWater7: round(avgWater7),
      weightTrend,
      weightChange,
      logsLast30Days: health30.length
    },
    nutrition: {
      today: todayTotals,
      todayMealCount: todayMeals.length,
      goals: nutritionGoals,
      avgDailyCalories,
      favouriteFoods
    },
    academic: {
      total: goals.length,
      completed: completedGoals,
      active: activeGoals.length,
      overdue: overdueGoals.length,
      atRisk: riskGoals.length,
      avgProgress: goals.length
        ? Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length)
        : 0,
      riskGoalIds: riskGoals.map((g) => g._id),
      upcomingDeadlines
    },
    documents: {
      expiringSoon: expiringDocs.map((d) => ({
        _id: d._id,
        title: d.title,
        category: d.category,
        expiryDate: d.expiryDate,
        daysLeft: daysLeft(d.expiryDate)
      }))
    },
    recommendations
  };
};

module.exports = {
  TARGETS,
  DAY_MS,
  startOfDay,
  endOfDay,
  daysLeft,
  isAtRisk,
  refreshOverdueGoals,
  buildInsights
};
