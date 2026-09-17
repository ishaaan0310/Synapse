const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  fileName: String,
  fileUrl: { type: String, required: true },
  fileType: { type: String, enum: ['pdf', 'docx', 'jpg', 'png', 'other'] },
  category: { type: String, enum: ['id', 'certificate', 'medical', 'academic', 'insurance', 'other'] },
  tags: [String],
  expiryDate: Date,
  ocrText: String, // extracted text from OCR
  metadata: {
    extractedFields: mongoose.Schema.Types.Mixed // flexible schema for AI-extracted data
  },
  uploadedAt: { type: Date, default: Date.now }
});

// Text index for search
documentSchema.index({ title: 'text', ocrText: 'text', tags: 'text' });

module.exports = mongoose.model('Document', documentSchema);