const express = require('express');
const router = express.Router();

const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const DEFAULT_GOALS = { calories: 2000, protein: 100, carbs: 250, fat: 70 };

const withDefaults = (goals = {}) => ({
  calories: goals.calories || DEFAULT_GOALS.calories,
  protein: goals.protein || DEFAULT_GOALS.protein,
  carbs: goals.carbs || DEFAULT_GOALS.carbs,
  fat: goals.fat || DEFAULT_GOALS.fat
});

// GET MY NUTRITION GOALS
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('nutritionGoals');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      goals: withDefaults(user.nutritionGoals)
    });

  } catch (error) {
    console.error('Get Goals Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load nutrition goals'
    });
  }
});

// UPDATE MY NUTRITION GOALS
// calories + protein are required, carbs + fat are optional
router.put('/', authMiddleware, async (req, res) => {
  try {
    const update = {};

    const rules = {
      calories: { required: true, max: 10000, label: 'Calories' },
      protein: { required: true, max: 1000, label: 'Protein' },
      carbs: { required: false, max: 2000, label: 'Carbs' },
      fat: { required: false, max: 1000, label: 'Fat' }
    };

    for (const [field, rule] of Object.entries(rules)) {
      const raw = req.body[field];

      if ((raw === undefined || raw === '') && !rule.required) continue;

      const value = Number(raw);

      if (!Number.isFinite(value) || value <= 0 || value > rule.max) {
        return res.status(400).json({
          success: false,
          message: `${rule.label} must be greater than 0 and at most ${rule.max}`
        });
      }

      update[`nutritionGoals.${field}`] = value;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: update },
      {
        new: true,
        runValidators: true
      }
    ).select('nutritionGoals');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Nutrition goals updated successfully',
      goals: withDefaults(user.nutritionGoals)
    });

  } catch (error) {
    console.error('Update Goals Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update nutrition goals'
    });
  }
});

module.exports = router;
