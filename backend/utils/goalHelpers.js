// Shared academic-goal rules, used by the Academic routes and the AI agent
const { startOfDay } = require('./insights');

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

module.exports = { statusFor, syncProgressFromMilestones };
