const express = require('express');
const router = express.Router();

const AcademicGoal = require('../models/AcademicGoal');
const authMiddleware = require('../middleware/authMiddleware');
const { daysLeft, isAtRisk, refreshOverdueGoals, startOfDay } = require('../utils/insights');

router.use(authMiddleware);

const CATEGORIES = ['exam', 'project', 'assignment', 'course'];
const PRIORITIES = ['low', 'medium', 'high'];

// Status follows progress, but a past deadline means "overdue"
const statusFor = (progress, deadline) => {
  if (progress >= 100) return 'completed';
  if (deadline && startOfDay(deadline) < startOfDay()) return 'overdue';
  return progress > 0 ? 'in-progress' : 'not-started';
};

// When a goal has milestones, progress = % of milestones completed
const syncProgressFromMilestones = (goal) => {
  if (goal.milestones.length > 0) {
    const done = goal.milestones.filter((m) => m.completed).length;
    goal.progress = Math.round((done / goal.milestones.length) * 100);
  }
  goal.status = statusFor(goal.progress, goal.deadline);
};

// Add computed fields the UI needs
const decorate = (goal) => ({
  ...goal.toObject(),
  daysLeft: daysLeft(goal.deadline),
  atRisk: isAtRisk(goal)
});

const parseGoalInput = (body, { partial = false } = {}) => {
  const data = {};

  if (body.title !== undefined || !partial) {
    const title = (body.title || '').trim();
    if (!title) return { error: 'Title is required' };
    data.title = title.slice(0, 120);
  }

  if (body.description !== undefined) {
    data.description = String(body.description).trim().slice(0, 1000);
  }

  if (body.category !== undefined || !partial) {
    if (!CATEGORIES.includes(body.category)) return { error: 'Invalid category' };
    data.category = body.category;
  }

  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) return { error: 'Invalid priority' };
    data.priority = body.priority;
  }

  if (body.deadline !== undefined || !partial) {
    const deadline = new Date(body.deadline);
    if (!body.deadline || Number.isNaN(deadline.getTime())) {
      return { error: 'A valid deadline is required' };
    }
    data.deadline = deadline;
  }

  return { data };
};

// ==========================================
// CREATE GOAL
// ==========================================
router.post('/', async (req, res) => {
  try {
    const { data, error } = parseGoalInput(req.body);

    if (error) {
      return res.status(400).json({ error });
    }

    const milestones = Array.isArray(req.body.milestones)
      ? req.body.milestones
          .map((m) => (typeof m === 'string' ? m : m?.title))
          .filter((t) => t && t.trim())
          .map((title) => ({ title: title.trim().slice(0, 120) }))
      : [];

    const goal = new AcademicGoal({
      user: req.userId,
      ...data,
      milestones
    });

    syncProgressFromMilestones(goal);

    await goal.save();

    res.status(201).json(decorate(goal));

  } catch (err) {
    console.error('Create academic goal error:', err);

    res.status(400).json({
      error: err.message
    });
  }
});

// ==========================================
// GET MY GOALS (+ stats)
// ==========================================
router.get('/', async (req, res) => {
  try {
    await refreshOverdueGoals(req.userId);

    const goals = await AcademicGoal
      .find({ user: req.userId })
      .sort({ deadline: 1 });

    const decorated = goals.map(decorate);

    res.json({
      goals: decorated,
      atRisk: decorated.filter((g) => g.atRisk).length,
      stats: {
        total: goals.length,
        completed: goals.filter((g) => g.status === 'completed').length,
        inProgress: goals.filter((g) => g.status === 'in-progress').length,
        overdue: goals.filter((g) => g.status === 'overdue').length,
        avgProgress: goals.length
          ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
          : 0
      }
    });

  } catch (err) {
    console.error('Get academic goals error:', err);

    res.status(500).json({
      error: err.message
    });
  }
});

// ==========================================
// UPDATE PROGRESS (manual slider)
// ==========================================
router.patch('/:id/progress', async (req, res) => {
  try {
    const progress = Number(req.body.progress);

    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      return res.status(400).json({
        error: 'Progress must be between 0 and 100'
      });
    }

    const goal = await AcademicGoal.findOne({ _id: req.params.id, user: req.userId });

    if (!goal) {
      return res.status(404).json({
        error: 'Goal not found'
      });
    }

    goal.progress = Math.round(progress);
    goal.status = statusFor(goal.progress, goal.deadline);
    await goal.save();

    res.json(decorate(goal));

  } catch (err) {
    console.error('Update academic goal error:', err);

    res.status(400).json({
      error: err.message
    });
  }
});

// ==========================================
// EDIT GOAL DETAILS
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const { data, error } = parseGoalInput(req.body, { partial: true });

    if (error) {
      return res.status(400).json({ error });
    }

    const goal = await AcademicGoal.findOne({ _id: req.params.id, user: req.userId });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    Object.assign(goal, data);
    goal.status = statusFor(goal.progress, goal.deadline);
    await goal.save();

    res.json(decorate(goal));
  } catch (err) {
    console.error('Edit academic goal error:', err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// DELETE GOAL
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const goal = await AcademicGoal.findOneAndDelete({ _id: req.params.id, user: req.userId });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ message: 'Goal deleted' });
  } catch (err) {
    console.error('Delete academic goal error:', err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// MILESTONES
// ==========================================

// Add milestone
router.post('/:id/milestones', async (req, res) => {
  try {
    const title = (req.body.title || '').trim();

    if (!title) {
      return res.status(400).json({ error: 'Milestone title is required' });
    }

    const goal = await AcademicGoal.findOne({ _id: req.params.id, user: req.userId });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    goal.milestones.push({
      title: title.slice(0, 120),
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined
    });

    syncProgressFromMilestones(goal);
    await goal.save();

    res.status(201).json(decorate(goal));
  } catch (err) {
    console.error('Add milestone error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Toggle milestone complete / incomplete
router.patch('/:id/milestones/:milestoneId', async (req, res) => {
  try {
    const goal = await AcademicGoal.findOne({ _id: req.params.id, user: req.userId });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const milestone = goal.milestones.id(req.params.milestoneId);

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    milestone.completed =
      typeof req.body.completed === 'boolean' ? req.body.completed : !milestone.completed;

    syncProgressFromMilestones(goal);
    await goal.save();

    res.json(decorate(goal));
  } catch (err) {
    console.error('Toggle milestone error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Delete milestone
router.delete('/:id/milestones/:milestoneId', async (req, res) => {
  try {
    const goal = await AcademicGoal.findOne({ _id: req.params.id, user: req.userId });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const milestone = goal.milestones.id(req.params.milestoneId);

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    milestone.deleteOne();
    syncProgressFromMilestones(goal);
    await goal.save();

    res.json(decorate(goal));
  } catch (err) {
    console.error('Delete milestone error:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
