const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const NutritionLog = require('../models/NutritionLog');
const authMiddleware = require('../middleware/authMiddleware');

// ==========================================
// ADD MEAL
// ==========================================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      mealType,
      foodName,
      items,
      calories,
      protein,
      carbs,
      fat,
      imageUrl
    } = req.body;

    let finalCalories = Number(calories) || 0;
    let finalProtein = Number(protein) || 0;
    let finalCarbs = Number(carbs) || 0;
    let finalFat = Number(fat) || 0;

    let processedItems = [];
    if (Array.isArray(items) && items.length > 0) {
      processedItems = items.map(item => ({
        name: item.name || 'Item',
        calories: Number(item.calories) || 0,
        protein: Number(item.protein) || 0,
        carbs: Number(item.carbs) || 0,
        fat: Number(item.fat) || 0
      }));

      // Sum totals if not manually overridden
      if (!calories) finalCalories = processedItems.reduce((s, i) => s + i.calories, 0);
      if (!protein) finalProtein = processedItems.reduce((s, i) => s + i.protein, 0);
      if (!carbs) finalCarbs = processedItems.reduce((s, i) => s + i.carbs, 0);
      if (!fat) finalFat = processedItems.reduce((s, i) => s + i.fat, 0);
    }

    const meal = new NutritionLog({
      user: req.userId,
      mealType,
      foodName: foodName || (processedItems[0]?.name ? `${processedItems[0].name} meal` : 'Meal'),
      items: processedItems,
      calories: finalCalories,
      protein: finalProtein,
      carbs: finalCarbs,
      fat: finalFat,
      imageUrl: imageUrl || '',
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
// GET TODAY'S MEALS + GOALS
// ==========================================
// ==========================================
// GET TODAY'S MEALS + GOALS
// ==========================================

router.get('/daily', authMiddleware, async (req, res) => {
  try {
    const User = require('../models/User');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
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
      meals,
      totals,
      goals: user?.nutritionGoals || {
        calories: 2000,
        protein: 100
      }
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
// GET ALL MY MEALS
// ==========================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const meals = await NutritionLog
      .find({ user: req.userId })
      .sort({ date: -1 });

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
// GET 7-DAY NUTRITION AGGREGATED TRENDS
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
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          totalCalories: { $sum: "$calories" },
          totalProtein: { $sum: "$protein" },
          totalCarbs: { $sum: "$carbs" },
          totalFat: { $sum: "$fat" },
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

module.exports = router;