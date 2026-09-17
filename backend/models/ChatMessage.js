const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  module: { type: String, enum: ['health', 'nutrition', 'academic', 'document', 'general'], default: 'general' },
  timestamp: { type: Date, default: Date.now }
});

chatMessageSchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);