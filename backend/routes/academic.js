const express = require('express');
const router = express.Router();

const AcademicGoal = require('../models/AcademicGoal');
const authMiddleware = require('../middleware/authMiddleware');

// Create goal
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      deadline,
      priority
    } = req.body;

    const goal = new AcademicGoal({
      user: req.userId,
      title,
      description,
      category,
      deadline,
      priority
    });

    await goal.save();

    res.status(201).json(goal);

  } catch (err) {
    console.error('Create academic goal error:', err);

    res.status(400).json({
      error: err.message
    });
  }
});

// Get goals for logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const goals = await AcademicGoal
      .find({ user: req.userId })
      .sort({ deadline: 1 });

    const now = new Date();

    const atRisk = goals.filter(goal => {
      const daysLeft =
        (goal.deadline - now) /
        (1000 * 60 * 60 * 24);

      return (
        daysLeft < 7 &&
        daysLeft >= 0 &&
        goal.progress < 50 &&
        goal.status !== 'completed'
      );
    });

    res.json({
      goals,
      atRisk: atRisk.length
    });

  } catch (err) {
    console.error('Get academic goals error:', err);

    res.status(500).json({
      error: err.message
    });
  }
});

// Update progress
router.patch('/:id/progress', authMiddleware, async (req, res) => {
  try {
    const { progress } = req.body;

    if (
      typeof progress !== 'number' ||
      progress < 0 ||
      progress > 100
    ) {
      return res.status(400).json({
        error: 'Progress must be between 0 and 100'
      });
    }

    const goal = await AcademicGoal.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.userId
      },
      {
        progress,
        status:
          progress === 100
            ? 'completed'
            : progress > 0
              ? 'in-progress'
              : 'not-started'
      },
      {
        new: true
      }
    );

    if (!goal) {
      return res.status(404).json({
        error: 'Goal not found'
      });
    }

    res.json(goal);

  } catch (err) {
    console.error('Update academic goal error:', err);

    res.status(400).json({
      error: err.message
    });
  }
});

// Delete goal
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const goal = await AcademicGoal.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });

    if (!goal) {
      return res.status(404).json({
        error: 'Goal not found'
      });
    }

    res.json({ message: 'Goal deleted successfully' });
  } catch (err) {
    console.error('Delete academic goal error:', err);
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;