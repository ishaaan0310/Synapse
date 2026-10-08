const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const NutritionLog = require('../models/NutritionLog');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

const DEFAULT_GOALS = { calories: 2000, protein: 100, carbs: 250, fat: 70 };

const withDefaultGoals = (goals = {}) => ({
  calories: goals.calories || DEFAULT_GOALS.calories,
  protein: goals.protein || DEFAULT_GOALS.protein,
  carbs: goals.carbs || DEFAULT_GOALS.carbs,
  fat: goals.fat || DEFAULT_GOALS.fat
});

// Validate + clean meal input. Returns { data } or { error }.
const parseMealInput = (body, { partial = false } = {}) => {
  const data = {};

  if (body.mealType !== undefined || !partial) {
    if (!MEAL_TYPES.includes(body.mealType)) {
      return { error: 'Meal type must be breakfast, lunch, dinner or snack' };
    }
    data.mealType = body.mealType;
  }

  if (body.foodName !== undefined || !partial) {
    let foodName = (body.foodName || '').trim();
    // A multi-item meal can be named after its first item
    if (!foodName && Array.isArray(body.items) && body.items[0]?.name) {
      foodName = `${String(body.items[0].name).trim()} meal`;
    }
    if (!foodName) return { error: 'Food name is required' };
    data.foodName = foodName.slice(0, 100);
  }

  for (const field of ['calories', 'protein', 'carbs', 'fat']) {
    if (body[field] === undefined || body[field] === '') {
      if (!partial) data[field] = 0;
      continue;
    }
    const value = Number(body[field]);
    if (!Number.isFinite(value) || value < 0 || value > 10000) {
      return { error: `${field} must be a number between 0 and 10000` };
    }
    data[field] = value;
  }

  if (body.imageUrl !== undefined) {
    const imageUrl = String(body.imageUrl || '').trim();
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      return { error: 'Image URL must start with http:// or https://' };
    }
    data.imageUrl = imageUrl.slice(0, 1000);
  }

  // Optional list of individual food items; totals are summed from them
  // unless calories/macros were given explicitly
  if (Array.isArray(body.items) && body.items.length > 0) {
    const items = body.items.slice(0, 20).map((item) => ({
      name: String(item?.name || 'Item').trim().slice(0, 100) || 'Item',
      calories: Math.max(0, Number(item?.calories) || 0),
      protein: Math.max(0, Number(item?.protein) || 0),
      carbs: Math.max(0, Number(item?.carbs) || 0),
      fat: Math.max(0, Number(item?.fat) || 0)
    }));
    data.items = items;

    for (const field of ['calories', 'protein', 'carbs', 'fat']) {
      if (body[field] === undefined || body[field] === '' || Number(body[field]) === 0) {
        data[field] = items.reduce((sum, item) => sum + item[field], 0);
      }
    }
  }

  return { data };
};

// ==========================================
// ADD MEAL
// ==========================================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = parseMealInput(req.body);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const meal = new NutritionLog({
      user: req.userId,
      ...data,
      date: new Date()
    });

    await meal.save();

    res.status(201).json({
      message: 'Meal logged successfully!',
      meal
    });

  } catch (error) {
    console.error('Nutrition save error:', error);

    res.status(500).json({
      message: 'Failed to save meal',
      error: error.message
    });
  }
});

// ==========================================
// GET MEALS + TOTALS FOR ONE DAY (default today)
// ?date=YYYY-MM-DD
// ==========================================

router.get('/daily', authMiddleware, async (req, res) => {
  try {
    const day = req.query.date ? new Date(`${req.query.date}T00:00:00`) : new Date();

    if (Number.isNaN(day.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }

    const startOfDay = new Date(day);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);

    const [meals, user] = await Promise.all([
      NutritionLog
        .find({
          user: req.userId,
          date: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        })
        .sort({ date: -1 }),

      User
        .findById(req.userId)
        .select('nutritionGoals')
    ]);

    const totals = meals.reduce(
      (acc, meal) => {
        acc.calories += meal.calories || 0;
        acc.protein += meal.protein || 0;
        acc.carbs += meal.carbs || 0;
        acc.fat += meal.fat || 0;

        return acc;
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      }
    );

    res.json({
      date: startOfDay,
      meals,
      totals,
      goals: withDefaultGoals(user?.nutritionGoals)
    });

  } catch (error) {
    console.error('Nutrition fetch error:', error);

    res.status(500).json({
      message: 'Failed to fetch nutrition data',
      error: error.message
    });
  }
});

// ==========================================
// LAST 7 DAYS - DAILY TOTALS (for the chart)
// ==========================================

router.get('/weekly', authMiddleware, async (req, res, next) => {
  try {
    const days = 7;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const [meals, user] = await Promise.all([
      NutritionLog.find({ user: req.userId, date: { $gte: start } }),
      User.findById(req.userId).select('nutritionGoals')
    ]);

    // Build one bucket per day (local time) so empty days show as 0
    const buckets = [];
    for (let i = 0; i < days; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      buckets.push({ date, calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 });
    }

    meals.forEach((meal) => {
      const mealDay = new Date(meal.date);
      mealDay.setHours(0, 0, 0, 0);
      const bucket = buckets.find((b) => b.date.getTime() === mealDay.getTime());
      if (!bucket) return;
      bucket.calories += meal.calories || 0;
      bucket.protein += meal.protein || 0;
      bucket.carbs += meal.carbs || 0;
      bucket.fat += meal.fat || 0;
      bucket.meals += 1;
    });

    const loggedDays = buckets.filter((b) => b.meals > 0);
    const averageCalories = loggedDays.length
      ? Math.round(loggedDays.reduce((s, b) => s + b.calories, 0) / loggedDays.length)
      : 0;

    res.json({
      days: buckets,
      averageCalories,
      goals: withDefaultGoals(user?.nutritionGoals)
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// GET 7-DAY NUTRITION AGGREGATED TRENDS (MongoDB aggregation pipeline)
// ==========================================
router.get('/history-trends', authMiddleware, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trends = await NutritionLog.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          totalCalories: { $sum: '$calories' },
          totalProtein: { $sum: '$protein' },
          totalCarbs: { $sum: '$carbs' },
          totalFat: { $sum: '$fat' },
          mealCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(trends);
  } catch (error) {
    console.error('Nutrition history trends error:', error);
    res.status(500).json({
      message: 'Failed to calculate nutrition trends',
      error: error.message
    });
  }
});

// ==========================================
// GET ALL MY MEALS
// ==========================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const meals = await NutritionLog
      .find({ user: req.userId })
      .sort({ date: -1 })
      .limit(500);

    res.json(meals);

  } catch (error) {
    console.error('Nutrition history error:', error);

    res.status(500).json({
      message: 'Failed to fetch nutrition history',
      error: error.message
    });
  }
});

// ==========================================
// UPDATE A MEAL
// ==========================================
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { data, error } = parseMealInput(req.body, { partial: true });

    if (error) {
      return res.status(400).json({ message: error });
    }

    const meal = await NutritionLog.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    res.json({ message: 'Meal updated', meal });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DELETE A MEAL
// ==========================================
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const meal = await NutritionLog.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });

    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    res.json({ message: 'Meal deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
