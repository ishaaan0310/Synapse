const express = require('express');
const router = express.Router();

const ChatMessage = require('../models/ChatMessage');
const authMiddleware = require('../middleware/authMiddleware');
const { buildInsights, TARGETS } = require('../utils/insights');

router.use(authMiddleware);

// ==========================================
// GET CHAT HISTORY (latest 100, oldest first)
// ==========================================

router.get('/', async (req, res) => {
  try {
    const latest = await ChatMessage
      .find({ user: req.userId })
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(latest.reverse());

  } catch (error) {
    console.error('Chat history error:', error);

    res.status(500).json({
      message: 'Failed to load chat history',
      error: error.message
    });
  }
});

// ==========================================
// INTENT DETECTION
// Whole-word matching, so "this" no longer matches "hi"
// ==========================================

const INTENTS = [
  { name: 'summary', words: ['summary', 'overview', 'how am i doing', 'report', 'status', 'score', 'wellness', 'overall'] },
  { name: 'water', words: ['water', 'hydration', 'hydrated', 'drink'] },
  { name: 'weight', words: ['weight', 'weigh', 'kg', 'bmi'] },
  { name: 'sleep', words: ['sleep', 'slept', 'tired', 'rest', 'insomnia'] },
  { name: 'activity', words: ['steps', 'walk', 'walking', 'exercise', 'active', 'activity', 'workout'] },
  { name: 'heart', words: ['heart', 'bpm', 'pulse'] },
  { name: 'health', words: ['health', 'healthy', 'fitness'] },
  { name: 'nutrition', words: ['food', 'meal', 'meals', 'eat', 'ate', 'eating', 'nutrition', 'calorie', 'calories', 'protein', 'carbs', 'fat', 'diet', 'hungry'] },
  { name: 'deadline', words: ['deadline', 'deadlines', 'due', 'upcoming', 'next', 'urgent'] },
  { name: 'academic', words: ['study', 'studying', 'exam', 'exams', 'assignment', 'assignments', 'academic', 'goal', 'goals', 'project', 'course', 'homework'] },
  { name: 'document', words: ['document', 'documents', 'expire', 'expiry', 'expiring', 'certificate', 'passport', 'id'] },
  { name: 'streak', words: ['streak', 'consistent', 'consistency'] },
  { name: 'help', words: ['help', 'what can you do', 'commands', 'features'] },
  { name: 'identity', words: ['who are you', 'digital twin', 'what are you'] },
  { name: 'thanks', words: ['thanks', 'thank you', 'thx', 'great', 'awesome'] },
  { name: 'greeting', words: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'namaste'] }
];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const detectIntents = (text) =>
  INTENTS
    .filter(({ words }) =>
      words.some((w) => new RegExp(`\\b${escapeRegex(w)}\\b`, 'i').test(text))
    )
    .map(({ name }) => name);

const MODULE_FOR_INTENT = {
  water: 'health', weight: 'health', sleep: 'health', activity: 'health',
  heart: 'health', health: 'health', nutrition: 'nutrition',
  deadline: 'academic', academic: 'academic', document: 'document'
};

const fmtDays = (n) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);

// ==========================================
// RESPONSE BUILDERS
// ==========================================

const responders = {
  summary: (d) => {
    const lines = [];
    lines.push(
      d.wellnessScore === null
        ? `Here's your overview, ${d.firstName}. Log a bit more data and I'll calculate your wellness score.`
        : `Here's your overview, ${d.firstName}. Your wellness score is **${d.wellnessScore}/100**.`
    );
    if (d.health.latest) {
      lines.push(`• Health: ${d.health.avgSleep7 ?? '-'}h avg sleep and ${d.health.avgSteps7?.toLocaleString() ?? '-'} avg steps this week.`);
    }
    lines.push(`• Nutrition: ${Math.round(d.nutrition.today.calories)} / ${d.nutrition.goals.calories} kcal today.`);
    lines.push(`• Academics: ${d.academic.active} active goal(s), ${d.academic.atRisk} at risk, ${d.academic.overdue} overdue.`);
    if (d.streak > 0) lines.push(`• You're on a ${d.streak}-day logging streak 🔥`);
    const top = d.recommendations.find((r) => r.priority === 'high') || d.recommendations[0];
    if (top) lines.push(`\nTop suggestion: ${top.message}`);
    return lines.join('\n');
  },

  sleep: (d) => {
    const latest = d.health.latest;
    if (!latest?.sleepHours) return 'I don\'t have any sleep data yet. Log your sleep hours on the Health page.';
    const avg = d.health.avgSleep7;
    let advice = 'That\'s in the healthy 7–9 hour range. Nice work.';
    if (latest.sleepHours < TARGETS.sleepMin) advice = 'That\'s below the recommended 7 hours. Try a consistent bedtime and no screens 30 minutes before sleep.';
    if (latest.sleepHours > TARGETS.sleepMax) advice = 'That\'s more than 9 hours. Oversleeping can leave you groggy, so a steady wake-up time helps.';
    return `You last logged **${latest.sleepHours}h** of sleep${latest.sleepQuality ? ` (${latest.sleepQuality} quality)` : ''}. ${avg ? `Your 7-day average is ${avg}h. ` : ''}${advice}`;
  },

  activity: (d) => {
    const latest = d.health.latest;
    if (!latest?.steps) return 'No step data yet. Log your steps or try "Sync Wearable" on the Health page.';
    const pct = Math.round((latest.steps / TARGETS.steps) * 100);
    return `Your latest log shows **${latest.steps.toLocaleString()} steps**, ${pct}% of an ${TARGETS.steps.toLocaleString()}-step target. ${
      d.health.avgSteps7 ? `Weekly average: ${d.health.avgSteps7.toLocaleString()}. ` : ''
    }${pct < 60 ? 'A 20-minute walk adds roughly 2,000 steps.' : pct >= 100 ? 'Target smashed! 🎉' : 'You\'re getting close. Keep moving!'}`;
  },

  water: (d) => {
    const latest = d.health.latest;
    if (!latest?.waterIntake) return 'I don\'t have water intake data yet. Add it when you log health metrics (in litres).';
    return `You last logged **${latest.waterIntake}L** of water. ${
      latest.waterIntake < 2
        ? `That's below the ~${TARGETS.water}L target. Keep a bottle nearby and sip regularly.`
        : 'Good hydration! 💧'
    }`;
  },

  weight: (d) => {
    const latest = d.health.latest;
    if (!latest?.weight) return 'No weight logged yet. Add it on the Health page and I\'ll track your trend.';
    let bmiText = '';
    if (latest.height) {
      const bmi = latest.weight / ((latest.height / 100) ** 2);
      bmiText = ` Your BMI is about ${bmi.toFixed(1)}.`;
    }
    const trend = d.health.weightTrend === 'not enough data'
      ? 'Log a few more entries to see your trend.'
      : `Over the last 30 days your weight is **${d.health.weightTrend}**${d.health.weightChange ? ` (${d.health.weightChange > 0 ? '+' : ''}${d.health.weightChange} kg)` : ''}.`;
    return `Your latest weight is **${latest.weight} kg**.${bmiText} ${trend}`;
  },

  heart: (d) => {
    const latest = d.health.latest;
    if (!latest?.heartRate) return 'No heart rate data yet.';
    return `Your last resting heart rate was **${latest.heartRate} BPM**. ${
      latest.heartRate > 100
        ? 'That\'s elevated. If it stays above 100 at rest, please consult a doctor.'
        : latest.heartRate < 50
          ? 'That\'s quite low. It\'s normal for athletes, but check with a doctor if you feel dizzy.'
          : 'That\'s within the normal 60–100 range.'
    }`;
  },

  health: (d) => {
    if (!d.health.latest) return 'I don\'t have enough health data yet. Log your sleep, steps, water, weight and heart rate first.';
    return [responders.sleep(d), responders.activity(d)].join('\n\n');
  },

  nutrition: (d) => {
    const { today, goals, todayMealCount, avgDailyCalories, favouriteFoods } = d.nutrition;
    if (todayMealCount === 0) {
      return `You haven't logged any meals today.${avgDailyCalories ? ` Your recent average is ${avgDailyCalories} kcal/day.` : ''} Add meals on the Nutrition page and I'll track your intake.`;
    }
    const remaining = Math.round(goals.calories - today.calories);
    return `Today you've had **${todayMealCount} meal(s)**: ${Math.round(today.calories)} kcal, ${Math.round(today.protein)}g protein, ${Math.round(today.carbs)}g carbs and ${Math.round(today.fat)}g fat. ${
      remaining > 0
        ? `You have about ${remaining} kcal left for your ${goals.calories} kcal goal.`
        : `You're ${Math.abs(remaining)} kcal over your goal.`
    }${today.protein < goals.protein ? ` You still need ${Math.round(goals.protein - today.protein)}g protein.` : ' Protein goal reached 💪'}${
      favouriteFoods.length ? `\nYour most-logged foods: ${favouriteFoods.join(', ')}.` : ''
    }`;
  },

  deadline: (d) => {
    const upcoming = d.academic.upcomingDeadlines;
    if (upcoming.length === 0) {
      return d.academic.overdue > 0
        ? `No upcoming deadlines, but ${d.academic.overdue} goal(s) are overdue. Review them on the Academic page.`
        : 'You have no upcoming deadlines. 🎉';
    }
    const list = upcoming
      .slice(0, 3)
      .map((g) => `• **${g.title}**: due ${fmtDays(g.daysLeft)}, ${g.progress}% done${g.atRisk ? ' ⚠️ at risk' : ''}`)
      .join('\n');
    return `Your next deadlines:\n${list}\n\nI'd start with "${upcoming[0].title}".`;
  },

  academic: (d) => {
    const a = d.academic;
    if (a.total === 0) return 'You have no academic goals yet. Create one on the Academic page and I\'ll help you prioritise.';
    if (a.active === 0) return `All ${a.completed} of your goals are complete. Nice work! 🎉`;
    let text = `You have **${a.active} active goal(s)** (${a.completed} completed, average progress ${a.avgProgress}%).`;
    if (a.overdue) text += ` ${a.overdue} overdue.`;
    if (a.atRisk) text += ` ${a.atRisk} at risk.`;
    if (a.upcomingDeadlines[0]) {
      const next = a.upcomingDeadlines[0];
      text += `\n\nFocus next on **${next.title}** (due ${fmtDays(next.daysLeft)}, ${next.progress}% done). Break it into milestones so progress tracks automatically.`;
    }
    if (d.health.avgSleep7 !== null && d.health.avgSleep7 < 6) {
      text += '\n\nTip: your sleep has been low. Well-rested study sessions improve retention significantly.';
    }
    return text;
  },

  document: (d) => {
    const docs = d.documents.expiringSoon;
    if (docs.length === 0) return 'None of your documents expire in the next 30 days. ✅';
    return `These documents expire soon:\n${docs
      .slice(0, 5)
      .map((doc) => `• **${doc.title}**: ${fmtDays(doc.daysLeft)}`)
      .join('\n')}`;
  },

  streak: (d) =>
    d.streak > 0
      ? `You're on a **${d.streak}-day** logging streak 🔥 Keep it going by logging something today.`
      : 'No active streak. Log a meal or health metric today to start one!',

  help: () =>
    'I can answer questions like:\n• "How am I doing?" (overall summary)\n• "How did I sleep?" / "How many steps?" / "Water intake?"\n• "What\'s my weight trend?"\n• "How many calories today?"\n• "What deadlines are coming up?"\n• "Which documents are expiring?"',

  identity: () =>
    'I\'m your Synapse Digital Twin. I learn from everything you log (health, nutrition, academics and documents) and turn it into personalised insights.',

  thanks: () => 'Anytime! 😊 Ask me for a summary whenever you want a check-in.',

  greeting: (d) =>
    `Hey ${d.firstName}! 👋 ${d.wellnessScore !== null ? `Your wellness score today is ${d.wellnessScore}/100. ` : ''}Ask me "How am I doing?" for a full summary.`
};

async function generateTwinResponse(userId, message) {
  const intents = detectIntents(message);
  const insights = await buildInsights(userId);
  const data = {
    ...insights,
    firstName: insights.user?.name?.split(' ')[0] || 'there'
  };

  if (intents.length === 0) {
    return {
      module: 'general',
      text: `I'm not sure how to answer "${message}" yet. ${responders.help()}`
    };
  }

  // Answer up to two specific topics (e.g. "sleep and calories").
  // Social intents (greeting/thanks) only answer when nothing else matched.
  const social = ['greeting', 'thanks'];
  const specific = intents.filter((i) => !social.includes(i));
  let chosen = specific.length ? specific : intents.slice(0, 1);

  // "health" is generic, so drop it if a more specific health topic matched
  if (chosen.length > 1) chosen = chosen.filter((i) => i !== 'health');
  if (chosen.includes('deadline')) chosen = chosen.filter((i) => i !== 'academic');
  chosen = chosen.slice(0, 2);

  return {
    module: MODULE_FOR_INTENT[chosen[0]] || 'general',
    text: chosen.map((intent) => responders[intent](data)).join('\n\n')
  };
}

// ==========================================
// SEND MESSAGE
// ==========================================

router.post('/', async (req, res) => {
  try {

    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';

    if (!content) {
      return res.status(400).json({
        message: 'Message cannot be empty'
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        message: 'Message is too long (max 1000 characters)'
      });
    }

    const response = await generateTwinResponse(req.userId, content);

    const userMessage = await ChatMessage.create({
      user: req.userId,
      role: 'user',
      content,
      module: response.module
    });

    const assistantMessage = await ChatMessage.create({
      user: req.userId,
      role: 'assistant',
      content: response.text,
      module: response.module,
      // keep ordering stable even within the same millisecond
      timestamp: new Date(userMessage.timestamp.getTime() + 1)
    });

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

// ==========================================
// CLEAR CHAT HISTORY
// ==========================================

router.delete('/', async (req, res) => {
  try {
    const result = await ChatMessage.deleteMany({ user: req.userId });
    res.json({ message: 'Chat history cleared', deleted: result.deletedCount });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ message: 'Failed to clear chat history' });
  }
});

module.exports = router;
module.exports.generateTwinResponse = generateTwinResponse; // exported for testing
