// ==========================================
// TOOLS THE AI AGENT CAN USE
//
// Every tool receives the logged-in user's id from the server.
// The model never chooses whose data it touches.
//
// - READ tools run immediately and return data to the model.
// - WRITE tools never run straight away: the agent proposes them,
//   the user sees a confirmation card, and only "Confirm" applies them.
// ==========================================

const mongoose = require('mongoose');

const HealthMetric = require('../models/HealthMetrics');
const NutritionLog = require('../models/NutritionLog');
const AcademicGoal = require('../models/AcademicGoal');
const Document = require('../models/Document');
const User = require('../models/User');

const { buildInsights, daysLeft, isAtRisk, refreshOverdueGoals, startOfDay } = require('../utils/insights');
const { statusFor, syncProgressFromMilestones } = require('../utils/goalHelpers');

// ------------------------------------------
// helpers
// ------------------------------------------

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const SLEEP_QUALITIES = ['poor', 'fair', 'good', 'excellent'];
const GOAL_CATEGORIES = ['exam', 'project', 'assignment', 'course'];
const PRIORITIES = ['low', 'medium', 'high'];
const DOC_CATEGORIES = ['id', 'certificate', 'medical', 'academic', 'insurance', 'other'];

const pad = (n) => String(n).padStart(2, '0');
const ymd = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Parse "YYYY-MM-DD" as a local date (midday avoids timezone edge cases)
const parseDay = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const num = (value, min, max, label) => {
  if (value === undefined || value === null || value === '') return { value: undefined };
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    return { error: `${label} must be a number between ${min} and ${max}` };
  }
  return { value: n };
};

const cleanText = (value, max) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const findOwnGoal = async (userId, goalId) => {
  if (!mongoose.isValidObjectId(goalId)) return null;
  return AcademicGoal.findOne({ _id: goalId, user: userId });
};

const goalForModel = (g) => ({
  id: String(g._id),
  title: g.title,
  description: g.description || undefined,
  category: g.category,
  priority: g.priority,
  deadline: ymd(g.deadline),
  daysLeft: daysLeft(g.deadline),
  progress: g.progress,
  status: g.status,
  atRisk: isAtRisk(g),
  milestones: g.milestones.map((m) => ({ id: String(m._id), title: m.title, completed: m.completed }))
});

// ==========================================
// READ TOOLS
// ==========================================

const readTools = {
  get_overview: {
    declaration: {
      name: 'get_overview',
      description:
        "Get a summary of the user's current state: wellness score, 7-day health averages, today's nutrition vs goals, academic goal counts and upcoming deadlines, expiring documents, logging streak and built-in recommendations. Call this first for broad questions like 'how am I doing'."
    },
    run: async (userId) => {
      const i = await buildInsights(userId);
      return {
        wellnessScore: i.wellnessScore,
        scoreBreakdown: i.scoreBreakdown,
        streakDays: i.streak,
        health: {
          latest: i.health.latest
            ? {
                date: ymd(i.health.latest.date),
                sleepHours: i.health.latest.sleepHours,
                sleepQuality: i.health.latest.sleepQuality,
                steps: i.health.latest.steps,
                heartRate: i.health.latest.heartRate,
                waterLitres: i.health.latest.waterIntake,
                weightKg: i.health.latest.weight
              }
            : null,
          avgSleep7: i.health.avgSleep7,
          avgSteps7: i.health.avgSteps7,
          avgWater7: i.health.avgWater7,
          weightTrend30: i.health.weightTrend,
          weightChangeKg: i.health.weightChange
        },
        nutrition: {
          today: i.nutrition.today,
          mealsLoggedToday: i.nutrition.todayMealCount,
          goals: i.nutrition.goals,
          avgDailyCalories7: i.nutrition.avgDailyCalories,
          favouriteFoods: i.nutrition.favouriteFoods
        },
        academic: {
          active: i.academic.active,
          completed: i.academic.completed,
          overdue: i.academic.overdue,
          atRisk: i.academic.atRisk,
          avgProgress: i.academic.avgProgress,
          upcomingDeadlines: i.academic.upcomingDeadlines.map((g) => ({
            id: String(g._id), title: g.title, daysLeft: g.daysLeft, progress: g.progress, priority: g.priority
          }))
        },
        expiringDocuments: i.documents.expiringSoon.map((d) => ({ title: d.title, daysLeft: d.daysLeft })),
        recommendations: i.recommendations.map((r) => r.message)
      };
    }
  },

  get_health_logs: {
    declaration: {
      name: 'get_health_logs',
      description: 'Get the user\'s health log entries (sleep, steps, heart rate, water in litres, weight, notes) for the last N days, newest first.',
      parameters: {
        type: 'OBJECT',
        properties: {
          days: { type: 'INTEGER', description: 'How many days back to look (1-90). Default 14.' }
        }
      }
    },
    run: async (userId, args) => {
      const days = Math.min(Math.max(Number(args.days) || 14, 1), 90);
      const since = startOfDay();
      since.setDate(since.getDate() - (days - 1));
      const logs = await HealthMetric.find({ user: userId, date: { $gte: since } }).sort({ date: -1 }).limit(120);
      return {
        days,
        count: logs.length,
        logs: logs.map((h) => ({
          date: ymd(h.date),
          sleepHours: h.sleepHours,
          sleepQuality: h.sleepQuality,
          steps: h.steps,
          heartRate: h.heartRate,
          waterLitres: h.waterIntake,
          weightKg: h.weight,
          notes: h.notes || undefined,
          source: h.source
        }))
      };
    }
  },

  get_meals: {
    declaration: {
      name: 'get_meals',
      description: 'Get logged meals. With "date" returns that day\'s meals and totals. With "days" returns per-day calorie and macro totals for the last N days.',
      parameters: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING', description: 'A single day, YYYY-MM-DD. Defaults to today.' },
          days: { type: 'INTEGER', description: 'Instead of one day, return daily totals for the last N days (1-30).' }
        }
      }
    },
    run: async (userId, args) => {
      if (args.days) {
        const days = Math.min(Math.max(Number(args.days) || 7, 1), 30);
        const since = startOfDay();
        since.setDate(since.getDate() - (days - 1));
        const meals = await NutritionLog.find({ user: userId, date: { $gte: since } }).sort({ date: 1 });
        const byDay = {};
        meals.forEach((m) => {
          const key = ymd(m.date);
          byDay[key] = byDay[key] || { date: key, meals: 0, calories: 0, protein: 0, carbs: 0, fat: 0 };
          byDay[key].meals += 1;
          ['calories', 'protein', 'carbs', 'fat'].forEach((k) => { byDay[key][k] += m[k] || 0; });
        });
        return { days, dailyTotals: Object.values(byDay) };
      }

      const day = args.date ? parseDay(args.date) : new Date();
      if (!day) return { error: 'date must be YYYY-MM-DD' };
      const start = startOfDay(day);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      const meals = await NutritionLog.find({ user: userId, date: { $gte: start, $lte: end } }).sort({ date: 1 });
      const totals = meals.reduce((a, m) => ({
        calories: a.calories + (m.calories || 0),
        protein: a.protein + (m.protein || 0),
        carbs: a.carbs + (m.carbs || 0),
        fat: a.fat + (m.fat || 0)
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
      return {
        date: ymd(start),
        totals,
        meals: meals.map((m) => ({
          mealType: m.mealType, foodName: m.foodName, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat,
          time: `${pad(new Date(m.date).getHours())}:${pad(new Date(m.date).getMinutes())}`
        }))
      };
    }
  },

  get_academic_goals: {
    declaration: {
      name: 'get_academic_goals',
      description: 'Get the user\'s academic goals with ids, deadlines, progress, status and milestones (with milestone ids). Needed before updating a goal or milestone.',
      parameters: {
        type: 'OBJECT',
        properties: {
          status: {
            type: 'STRING',
            enum: ['active', 'completed', 'overdue', 'all'],
            description: 'Filter. "active" = not completed (default).'
          }
        }
      }
    },
    run: async (userId, args) => {
      await refreshOverdueGoals(userId);
      const status = args.status || 'active';
      const filter = { user: userId };
      if (status === 'active') filter.status = { $ne: 'completed' };
      else if (status !== 'all') filter.status = status;
      const goals = await AcademicGoal.find(filter).sort({ deadline: 1 }).limit(50);
      return { count: goals.length, goals: goals.map(goalForModel) };
    }
  },

  search_documents: {
    declaration: {
      name: 'search_documents',
      description: 'Search the user\'s document vault by text (title, file name, tags) and/or category. Returns metadata only (not file contents).',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: 'Text to search for. Optional.' },
          category: { type: 'STRING', enum: DOC_CATEGORIES, description: 'Optional category filter.' }
        }
      }
    },
    run: async (userId, args) => {
      const filter = { user: userId };
      if (DOC_CATEGORIES.includes(args.category)) filter.category = args.category;
      const q = cleanText(args.query, 100);
      if (q) {
        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ title: regex }, { fileName: regex }, { tags: regex }];
      }
      const docs = await Document.find(filter).sort({ uploadedAt: -1 }).limit(30);
      return {
        count: docs.length,
        documents: docs.map((d) => ({
          title: d.title,
          category: d.category,
          fileType: d.fileType,
          tags: d.tags,
          uploaded: ymd(d.uploadedAt),
          expiryDate: ymd(d.expiryDate),
          daysUntilExpiry: d.expiryDate ? daysLeft(d.expiryDate) : null
        }))
      };
    }
  }
};

// ==========================================
// WRITE TOOLS (need user confirmation)
// Each has:
//   prepare(userId, args) -> { args, summary, details } or { error }
//   execute(userId, args) -> human readable result string
// ==========================================

const writeTools = {
  log_meal: {
    declaration: {
      name: 'log_meal',
      description: 'Propose logging a meal for today. If the user did not give nutrition numbers, estimate realistic values for the stated portion (common Indian and international foods) and say they are estimates.',
      parameters: {
        type: 'OBJECT',
        properties: {
          mealType: { type: 'STRING', enum: MEAL_TYPES },
          foodName: { type: 'STRING', description: 'Short description, e.g. "2 rotis with dal"' },
          calories: { type: 'NUMBER', description: 'kcal' },
          protein: { type: 'NUMBER', description: 'grams' },
          carbs: { type: 'NUMBER', description: 'grams' },
          fat: { type: 'NUMBER', description: 'grams' }
        },
        required: ['mealType', 'foodName', 'calories']
      }
    },
    prepare: async (userId, a) => {
      if (!MEAL_TYPES.includes(a.mealType)) return { error: `mealType must be one of ${MEAL_TYPES.join(', ')}` };
      const foodName = cleanText(a.foodName, 100);
      if (!foodName) return { error: 'foodName is required' };
      const out = { mealType: a.mealType, foodName };
      for (const [k, max] of [['calories', 5000], ['protein', 500], ['carbs', 1000], ['fat', 500]]) {
        const r = num(a[k], 0, max, k);
        if (r.error) return { error: r.error };
        out[k] = Math.round(r.value || 0);
      }
      return {
        args: out,
        summary: `Log ${out.mealType}: ${foodName}`,
        details: [`${out.calories} kcal`, `Protein ${out.protein}g`, `Carbs ${out.carbs}g`, `Fat ${out.fat}g`]
      };
    },
    execute: async (userId, a) => {
      await NutritionLog.create({ user: userId, ...a, date: new Date() });
      return `Logged ${a.foodName} (${a.calories} kcal) for ${a.mealType}.`;
    }
  },

  log_health_metric: {
    declaration: {
      name: 'log_health_metric',
      description: 'Propose logging health metrics. Include only the values the user actually stated. Never invent measurements.',
      parameters: {
        type: 'OBJECT',
        properties: {
          sleepHours: { type: 'NUMBER' },
          sleepQuality: { type: 'STRING', enum: SLEEP_QUALITIES },
          steps: { type: 'INTEGER' },
          heartRate: { type: 'INTEGER', description: 'Resting BPM' },
          waterIntake: { type: 'NUMBER', description: 'Litres' },
          weight: { type: 'NUMBER', description: 'kg' },
          notes: { type: 'STRING' },
          date: { type: 'STRING', description: 'YYYY-MM-DD if not today. Cannot be in the future.' }
        }
      }
    },
    prepare: async (userId, a) => {
      const rules = {
        sleepHours: [0, 24, 'Sleep', 'h'], steps: [0, 150000, 'Steps', ''], heartRate: [20, 250, 'Heart rate', ' BPM'],
        waterIntake: [0, 15, 'Water', ' L'], weight: [1, 400, 'Weight', ' kg']
      };
      const out = {};
      const details = [];
      for (const [k, [min, max, label, unit]] of Object.entries(rules)) {
        const r = num(a[k], min, max, label);
        if (r.error) return { error: r.error };
        if (r.value !== undefined) {
          out[k] = r.value;
          details.push(`${label}: ${r.value.toLocaleString()}${unit}`);
        }
      }
      if (Object.keys(out).length === 0) return { error: 'Include at least one metric the user stated.' };
      if (a.sleepQuality) {
        if (!SLEEP_QUALITIES.includes(a.sleepQuality)) return { error: 'Invalid sleepQuality' };
        out.sleepQuality = a.sleepQuality;
        details.push(`Sleep quality: ${a.sleepQuality}`);
      }
      const notes = cleanText(a.notes, 500);
      if (notes) { out.notes = notes; details.push(`Notes: ${notes}`); }
      let when = 'today';
      if (a.date) {
        const d = parseDay(a.date);
        if (!d) return { error: 'date must be YYYY-MM-DD' };
        if (startOfDay(d) > startOfDay()) return { error: 'date cannot be in the future' };
        out.date = a.date;
        when = a.date;
      }
      return { args: out, summary: `Log health metrics for ${when}`, details };
    },
    execute: async (userId, a) => {
      const { date, ...rest } = a;
      await HealthMetric.create({ user: userId, ...rest, source: 'manual', date: date ? parseDay(date) : new Date() });
      return 'Health metrics logged.';
    }
  },

  create_goal: {
    declaration: {
      name: 'create_goal',
      description: 'Propose creating an academic goal, optionally with milestones (for study plans, break the work into 3-8 concrete milestones).',
      parameters: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          category: { type: 'STRING', enum: GOAL_CATEGORIES },
          priority: { type: 'STRING', enum: PRIORITIES },
          deadline: { type: 'STRING', description: 'YYYY-MM-DD, today or later' },
          milestones: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Milestone titles in order' }
        },
        required: ['title', 'category', 'deadline']
      }
    },
    prepare: async (userId, a) => {
      const title = cleanText(a.title, 120);
      if (!title) return { error: 'title is required' };
      if (!GOAL_CATEGORIES.includes(a.category)) return { error: `category must be one of ${GOAL_CATEGORIES.join(', ')}` };
      const priority = PRIORITIES.includes(a.priority) ? a.priority : 'medium';
      const deadline = parseDay(a.deadline);
      if (!deadline) return { error: 'deadline must be YYYY-MM-DD' };
      if (startOfDay(deadline) < startOfDay()) return { error: 'deadline cannot be in the past' };
      const milestones = (Array.isArray(a.milestones) ? a.milestones : [])
        .map((m) => cleanText(String(m), 120)).filter(Boolean).slice(0, 12);
      const out = { title, description: cleanText(a.description, 1000), category: a.category, priority, deadline: a.deadline, milestones };
      return {
        args: out,
        summary: `Create ${a.category} goal: ${title}`,
        details: [
          `Deadline: ${a.deadline}`,
          `Priority: ${priority}`,
          ...milestones.map((m, i) => `${i + 1}. ${m}`)
        ]
      };
    },
    execute: async (userId, a) => {
      const goal = new AcademicGoal({
        user: userId,
        title: a.title,
        description: a.description,
        category: a.category,
        priority: a.priority,
        deadline: parseDay(a.deadline),
        milestones: a.milestones.map((title) => ({ title }))
      });
      syncProgressFromMilestones(goal);
      await goal.save();
      return `Created goal "${a.title}"${a.milestones.length ? ` with ${a.milestones.length} milestones` : ''}.`;
    }
  },

  add_milestones: {
    declaration: {
      name: 'add_milestones',
      description: 'Propose adding milestones to an existing goal. Get the goal id from get_academic_goals first.',
      parameters: {
        type: 'OBJECT',
        properties: {
          goalId: { type: 'STRING' },
          titles: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['goalId', 'titles']
      }
    },
    prepare: async (userId, a) => {
      const goal = await findOwnGoal(userId, a.goalId);
      if (!goal) return { error: 'Goal not found. Call get_academic_goals to get valid ids.' };
      const titles = (Array.isArray(a.titles) ? a.titles : []).map((t) => cleanText(String(t), 120)).filter(Boolean).slice(0, 12);
      if (!titles.length) return { error: 'Provide at least one milestone title' };
      return {
        args: { goalId: String(goal._id), titles },
        summary: `Add ${titles.length} milestone(s) to "${goal.title}"`,
        details: titles.map((t) => `• ${t}`)
      };
    },
    execute: async (userId, a) => {
      const goal = await findOwnGoal(userId, a.goalId);
      if (!goal) throw new Error('Goal no longer exists');
      a.titles.forEach((title) => goal.milestones.push({ title }));
      syncProgressFromMilestones(goal);
      await goal.save();
      return `Added ${a.titles.length} milestone(s) to "${goal.title}". Progress is now ${goal.progress}%.`;
    }
  },

  set_milestone_status: {
    declaration: {
      name: 'set_milestone_status',
      description: 'Propose marking a milestone complete or not complete. Get ids from get_academic_goals.',
      parameters: {
        type: 'OBJECT',
        properties: {
          goalId: { type: 'STRING' },
          milestoneId: { type: 'STRING' },
          completed: { type: 'BOOLEAN' }
        },
        required: ['goalId', 'milestoneId', 'completed']
      }
    },
    prepare: async (userId, a) => {
      const goal = await findOwnGoal(userId, a.goalId);
      if (!goal) return { error: 'Goal not found. Call get_academic_goals to get valid ids.' };
      const milestone = mongoose.isValidObjectId(a.milestoneId) ? goal.milestones.id(a.milestoneId) : null;
      if (!milestone) return { error: 'Milestone not found on that goal.' };
      const completed = a.completed !== false;
      return {
        args: { goalId: String(goal._id), milestoneId: String(milestone._id), completed },
        summary: `${completed ? 'Complete' : 'Reopen'} milestone "${milestone.title}"`,
        details: [`Goal: ${goal.title}`]
      };
    },
    execute: async (userId, a) => {
      const goal = await findOwnGoal(userId, a.goalId);
      const milestone = goal?.milestones.id(a.milestoneId);
      if (!milestone) throw new Error('Milestone no longer exists');
      milestone.completed = a.completed;
      syncProgressFromMilestones(goal);
      await goal.save();
      return `"${milestone.title}" marked ${a.completed ? 'complete' : 'not complete'}. "${goal.title}" is now ${goal.progress}% done.`;
    }
  },

  update_goal: {
    declaration: {
      name: 'update_goal',
      description: 'Propose changing an existing goal: title, deadline, priority, or progress (progress only for goals without milestones).',
      parameters: {
        type: 'OBJECT',
        properties: {
          goalId: { type: 'STRING' },
          title: { type: 'STRING' },
          deadline: { type: 'STRING', description: 'YYYY-MM-DD' },
          priority: { type: 'STRING', enum: PRIORITIES },
          progress: { type: 'INTEGER', description: '0-100' }
        },
        required: ['goalId']
      }
    },
    prepare: async (userId, a) => {
      const goal = await findOwnGoal(userId, a.goalId);
      if (!goal) return { error: 'Goal not found. Call get_academic_goals to get valid ids.' };
      const out = { goalId: String(goal._id) };
      const details = [];
      if (a.title !== undefined) {
        const t = cleanText(a.title, 120);
        if (!t) return { error: 'title cannot be empty' };
        out.title = t; details.push(`Title → ${t}`);
      }
      if (a.deadline !== undefined) {
        if (!parseDay(a.deadline)) return { error: 'deadline must be YYYY-MM-DD' };
        out.deadline = a.deadline; details.push(`Deadline: ${ymd(goal.deadline)} → ${a.deadline}`);
      }
      if (a.priority !== undefined) {
        if (!PRIORITIES.includes(a.priority)) return { error: 'Invalid priority' };
        out.priority = a.priority; details.push(`Priority: ${goal.priority} → ${a.priority}`);
      }
      if (a.progress !== undefined) {
        if (goal.milestones.length) return { error: 'This goal uses milestones; update milestones instead of progress.' };
        const r = num(a.progress, 0, 100, 'progress');
        if (r.error) return { error: r.error };
        out.progress = Math.round(r.value); details.push(`Progress: ${goal.progress}% → ${out.progress}%`);
      }
      if (details.length === 0) return { error: 'Nothing to change' };
      return { args: out, summary: `Update goal "${goal.title}"`, details };
    },
    execute: async (userId, a) => {
      const goal = await findOwnGoal(userId, a.goalId);
      if (!goal) throw new Error('Goal no longer exists');
      if (a.title) goal.title = a.title;
      if (a.deadline) goal.deadline = parseDay(a.deadline);
      if (a.priority) goal.priority = a.priority;
      if (a.progress !== undefined) goal.progress = a.progress;
      goal.status = statusFor(goal.progress, goal.deadline);
      await goal.save();
      return `Updated "${goal.title}".`;
    }
  },

  set_nutrition_goals: {
    declaration: {
      name: 'set_nutrition_goals',
      description: 'Propose changing daily nutrition targets. Only include the values to change.',
      parameters: {
        type: 'OBJECT',
        properties: {
          calories: { type: 'NUMBER' },
          protein: { type: 'NUMBER' },
          carbs: { type: 'NUMBER' },
          fat: { type: 'NUMBER' }
        }
      }
    },
    prepare: async (userId, a) => {
      const out = {};
      const details = [];
      for (const [k, max, unit] of [['calories', 10000, 'kcal'], ['protein', 1000, 'g'], ['carbs', 2000, 'g'], ['fat', 1000, 'g']]) {
        const r = num(a[k], 1, max, k);
        if (r.error) return { error: r.error };
        if (r.value !== undefined) { out[k] = Math.round(r.value); details.push(`${k}: ${out[k]} ${unit}`); }
      }
      if (!details.length) return { error: 'Nothing to change' };
      return { args: out, summary: 'Update daily nutrition goals', details };
    },
    execute: async (userId, a) => {
      const set = {};
      Object.entries(a).forEach(([k, v]) => { set[`nutritionGoals.${k}`] = v; });
      await User.updateOne({ _id: userId }, { $set: set });
      return 'Nutrition goals updated.';
    }
  }
};

const functionDeclarations = [
  ...Object.values(readTools).map((t) => t.declaration),
  ...Object.values(writeTools).map((t) => t.declaration)
];

module.exports = { readTools, writeTools, functionDeclarations, ymd };
