const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  module: { type: String, enum: ['health', 'nutrition', 'academic', 'document', 'general'], default: 'general' },
  // Changes the AI agent proposed in this message (shown as confirm cards)
  actions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AgentAction' }],
  // 'agent' = answered by Gemini, 'rules' = built-in keyword answers
  source: { type: String, enum: ['agent', 'rules'], default: 'rules' },
  timestamp: { type: Date, default: Date.now }
});

chatMessageSchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
