const mongoose = require('mongoose');

// A change the AI agent wants to make. It is only applied after the
// user clicks "Confirm" in the chat.
const agentActionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
  tool: { type: String, required: true },
  args: { type: mongoose.Schema.Types.Mixed, default: {} },
  summary: { type: String, required: true },
  details: [String],
  status: {
    type: String,
    enum: ['pending', 'executing', 'confirmed', 'cancelled', 'failed', 'expired'],
    default: 'pending'
  },
  resultMessage: String,
  createdAt: { type: Date, default: Date.now },
  resolvedAt: Date
});

agentActionSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('AgentAction', agentActionSchema);
