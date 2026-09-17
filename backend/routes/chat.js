const express = require('express');
const router = express.Router();

const ChatMessage = require('../models/ChatMessage');
const HealthMetric = require('../models/HealthMetrics');
const NutritionLog = require('../models/NutritionLog');
const AcademicGoal = require('../models/AcademicGoal');

const authMiddleware = require('../middleware/authMiddleware');

// ==========================================
// GET CHAT HISTORY
// ==========================================

router.get('/', authMiddleware, async (req, res) => {
  try {
    const messages = await ChatMessage
      .find({ user: req.userId })
      .sort({ timestamp: 1 })
      .limit(100);

    res.json(messages);

  } catch (error) {
    console.error('Chat history error:', error);

    res.status(500).json({
      message: 'Failed to load chat history',
      error: error.message
    });
  }
});

// ==========================================
// GENERATE PERSONALIZED RESPONSE
// ==========================================

async function generateTwinResponse(userId, message) {

  const text = message.toLowerCase();

  // Get user's latest health data
  const latestHealth = await HealthMetric
    .findOne({ user: userId })
    .sort({ date: -1 });

  // Get today's nutrition
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const meals = await NutritionLog.find({
    user: userId,
    date: { $gte: startOfDay }
  });

  const calories = meals.reduce(
    (sum, meal) => sum + (meal.calories || 0),
    0
  );

  // Get academic goals
  const goals = await AcademicGoal.find({
    user: userId
  });

  const pendingGoals = goals.filter(
    goal => goal.status !== 'completed'
  );

  // ==========================================
  // HEALTH
  // ==========================================

  if (
    text.includes('sleep') ||
    text.includes('health') ||
    text.includes('steps')
  ) {

    if (!latestHealth) {
      return 'I do not have enough health data yet. Try logging your sleep, steps, weight and heart rate first.';
    }

    return `Based on your latest health log, you recorded ${latestHealth.sleepHours || 0} hours of sleep, ${latestHealth.steps || 0} steps, a heart rate of ${latestHealth.heartRate || 0} BPM and a weight of ${latestHealth.weight || 0} kg. ${
      latestHealth.sleepHours < 6
        ? 'Your sleep is a little low, so getting more rest would be a good priority.'
        : 'Your sleep duration looks reasonable.'
    }`;
  }

  // ==========================================
  // NUTRITION
  // ==========================================

  if (
    text.includes('food') ||
    text.includes('meal') ||
    text.includes('nutrition') ||
    text.includes('calorie')
  ) {

    if (meals.length === 0) {
      return 'You have not logged any meals today. Add your meals in the Nutrition section and I can analyze your daily intake.';
    }

    return `You have logged ${meals.length} meal(s) today with approximately ${calories} calories. Keep logging your meals so I can identify your nutrition patterns over time.`;
  }

  // ==========================================
  // ACADEMIC
  // ==========================================

  if (
    text.includes('study') ||
    text.includes('exam') ||
    text.includes('assignment') ||
    text.includes('academic') ||
    text.includes('goal')
  ) {

    if (pendingGoals.length === 0) {
      return 'You currently have no pending academic goals. Nice work! 🎉';
    }

    const highPriority = pendingGoals.filter(
      goal => goal.priority === 'high'
    );

    if (highPriority.length > 0) {
      return `You have ${pendingGoals.length} pending academic goal(s), including ${highPriority.length} high-priority goal(s). I recommend focusing on the highest-priority goal first.`;
    }

    return `You currently have ${pendingGoals.length} pending academic goal(s). Try completing the one with the nearest deadline first.`;
  }

  // ==========================================
  // GENERAL SYNAPSE RESPONSE
  // ==========================================

  if (
    text.includes('hello') ||
    text.includes('hi') ||
    text.includes('hey')
  ) {
    return 'Hey! 👋 I am your Synapse Digital Twin. I can help you understand your health, nutrition and academic progress.';
  }

  if (
    text.includes('who are you') ||
    text.includes('digital twin')
  ) {
    return 'I am your Synapse Digital Twin. I use the information you log in Synapse to give you personalized insights and recommendations.';
  }

  return `I understand you said: "${message}". I can currently analyze your health, nutrition and academic data. Try asking me something like "How is my health?", "How many calories did I eat today?" or "What should I study next?"`;
}

// ==========================================
// SEND MESSAGE
// ==========================================

router.post('/', authMiddleware, async (req, res) => {
  try {

    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: 'Message cannot be empty'
      });
    }

    // Save user message
    const userMessage = new ChatMessage({
      user: req.userId,
      role: 'user',
      content: content.trim(),
      module: 'general'
    });

    await userMessage.save();

    // Generate response
    const responseText =
      await generateTwinResponse(
        req.userId,
        content.trim()
      );

    // Save AI response
    const assistantMessage = new ChatMessage({
      user: req.userId,
      role: 'assistant',
      content: responseText,
      module: 'general'
    });

    await assistantMessage.save();

    res.status(201).json({
      userMessage,
      assistantMessage
    });

  } catch (error) {

    console.error('Chat error:', error);

    res.status(500).json({
      message: 'Failed to process chat',
      error: error.message
    });
  }
});

module.exports = router;