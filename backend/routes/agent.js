const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const ChatMessage = require('../models/ChatMessage');
const authMiddleware = require('../middleware/authMiddleware');
const { isAgentEnabled, getModel } = require('../agent/gemini');
const { confirmAction, cancelAction } = require('../agent/agent');

router.use(authMiddleware);

// Is the Gemini agent switched on? (Only says whether a key exists.)
router.get('/status', (req, res) => {
  res.json({
    enabled: isAgentEnabled(),
    provider: 'gemini',
    model: isAgentEnabled() ? getModel() : null
  });
});

const checkId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid action id' });
  }
  next();
};

// ==========================================
// CONFIRM A PROPOSED CHANGE
// ==========================================
router.post('/actions/:id/confirm', checkId, async (req, res, next) => {
  try {
    const { action, notFound, alreadyResolved } = await confirmAction(req.userId, req.params.id);

    if (notFound) return res.status(404).json({ message: 'Action not found' });

    if (alreadyResolved) {
      return res.status(409).json({ message: `This action was already ${action.status}.`, action });
    }

    // Leave a short note in the chat so the history shows what happened
    const icon = action.status === 'confirmed' ? '✅' : '⚠️';
    const followUp = await ChatMessage.create({
      user: req.userId,
      role: 'assistant',
      content: `${icon} ${action.resultMessage}`,
      source: 'agent'
    });

    res.json({ action, message: followUp });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// CANCEL A PROPOSED CHANGE
// ==========================================
router.post('/actions/:id/cancel', checkId, async (req, res, next) => {
  try {
    const { action, notFound, alreadyResolved } = await cancelAction(req.userId, req.params.id);

    if (notFound) return res.status(404).json({ message: 'Action not found' });
    if (alreadyResolved) {
      return res.status(409).json({ message: `This action was already ${action.status}.`, action });
    }

    res.json({ action });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
