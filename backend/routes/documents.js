const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const Document = require('../models/Document');
const authMiddleware = require('../middleware/authMiddleware');

// ==========================================
// MULTER STORAGE
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      '-' +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// ==========================================
// HELPER - DETECT FILE TYPE
// ==========================================

const getFileType = (mimeType) => {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }

  if (
    mimeType.includes('word') ||
    mimeType.includes('officedocument')
  ) {
    return 'docx';
  }

  if (mimeType === 'image/png') {
    return 'png';
  }

  if (
    mimeType === 'image/jpeg' ||
    mimeType === 'image/jpg'
  ) {
    return 'jpg';
  }

  return 'other';
};

// ==========================================
// UPLOAD DOCUMENT
// ==========================================

router.post(
  '/upload',
  authMiddleware,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'Please select a file'
        });
      }

      const document = new Document({
        user: req.userId,

        title: req.body.title || req.file.originalname,

        fileName: req.file.originalname,

        fileUrl: `/uploads/${req.file.filename}`,

        fileType: getFileType(req.file.mimetype),

        category: req.body.category || 'other',

        expiryDate: req.body.expiryDate
          ? new Date(req.body.expiryDate)
          : undefined,

        tags: req.body.tags
          ? req.body.tags
              .split(',')
              .map(tag => tag.trim())
              .filter(Boolean)
          : []
      });

      await document.save();

      res.status(201).json({
        message: 'Document uploaded successfully!',
        document
      });

    } catch (error) {
      console.error('Document upload error:', error);

      res.status(500).json({
        message: 'Failed to upload document',
        error: error.message
      });
    }
  }
);

// ==========================================
// GET ALL MY DOCUMENTS
// ==========================================

router.get('/', authMiddleware, async (req, res) => {
  try {
    const documents = await Document
      .find({ user: req.userId })
      .sort({ uploadedAt: -1 });

    res.json(documents);

  } catch (error) {
    console.error('Document fetch error:', error);

    res.status(500).json({
      message: 'Failed to fetch documents',
      error: error.message
    });
  }
});

// ==========================================
// SEARCH MY DOCUMENTS
// ==========================================

router.get('/search', authMiddleware, async (req, res) => {
  try {
    const query = req.query.q?.trim();

    if (!query) {
      const documents = await Document
        .find({ user: req.userId })
        .sort({ uploadedAt: -1 });

      return res.json(documents);
    }

    const documents = await Document.find({
      user: req.userId,
      $text: {
        $search: query
      }
    }).sort({ uploadedAt: -1 });

    res.json(documents);

  } catch (error) {
    console.error('Document search error:', error);

    res.status(500).json({
      message: 'Failed to search documents',
      error: error.message
    });
  }
});

// ==========================================
// EXPIRING DOCUMENTS
// ==========================================

router.get('/expiry', authMiddleware, async (req, res) => {
  try {
    const now = new Date();

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(
      thirtyDaysFromNow.getDate() + 30
    );

    const documents = await Document.find({
      user: req.userId,

      expiryDate: {
        $gte: now,
        $lte: thirtyDaysFromNow
      }
    }).sort({
      expiryDate: 1
    });

    res.json(documents);

  } catch (error) {
    console.error('Expiry error:', error);

    res.status(500).json({
      message: 'Failed to fetch expiry information',
      error: error.message
    });
  }
});

module.exports = router;