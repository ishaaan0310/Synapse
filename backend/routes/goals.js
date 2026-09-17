const express = require('express');
const router = express.Router();

const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// ==========================================
// GET MY NUTRITION GOALS
// ==========================================

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('nutritionGoals');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json(
      user.nutritionGoals || {
        calories: 2000,
        protein: 100
      }
    );

  } catch (error) {
    console.error('Get goals error:', error);

    res.status(500).json({
      message: 'Failed to load goals'
    });
  }
});

// ==========================================
// UPDATE MY NUTRITION GOALS
// ==========================================

router.put('/', authMiddleware, async (req, res) => {
  try {
    const calories = Number(req.body.calories);
    const protein = Number(req.body.protein);

    if (
      !Number.isFinite(calories) ||
      calories <= 0
    ) {
      return res.status(400).json({
        message: 'Calories must be greater than 0'
      });
    }

    if (
      !Number.isFinite(protein) ||
      protein <= 0
    ) {
      return res.status(400).json({
        message: 'Protein must be greater than 0'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          'nutritionGoals.calories': calories,
          'nutritionGoals.protein': protein,
          updatedAt: new Date()
        }
      },
      {
        new: true
      }
    ).select('nutritionGoals');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      message: 'Nutrition goals updated!',
      goals: user.nutritionGoals
    });

  } catch (error) {
    console.error('Update goals error:', error);

    res.status(500).json({
      message: 'Failed to update goals',
      error: error.message
    });
  }
});

module.exports = router;