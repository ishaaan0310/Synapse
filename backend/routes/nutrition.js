const express = require('express');
const router = express.Router();

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
      calories,
      protein,
      carbs,
      fat,
      imageUrl
    } = req.body;

    const meal = new NutritionLog({
      user: req.userId,
      mealType,
      foodName,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
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

module.exports = router;