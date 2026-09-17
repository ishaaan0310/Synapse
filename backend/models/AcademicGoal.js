const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  dueDate: Date
});

const academicGoalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  category: { type: String, enum: ['exam', 'project', 'assignment', 'course'], required: true },
  deadline: { type: Date, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  milestones: [milestoneSchema],
  status: { type: String, enum: ['not-started', 'in-progress', 'completed', 'overdue'], default: 'not-started' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AcademicGoal', academicGoalSchema);