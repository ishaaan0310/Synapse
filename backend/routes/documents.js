const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Document = require('../models/Document');
const authMiddleware = require('../middleware/authMiddleware');

// Absolute path so uploads work no matter which folder you start node from
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const CATEGORIES = ['id', 'certificate', 'medical', 'academic', 'insurance', 'other'];

const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'application/msword': 'docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg'
};

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];

// ==========================================
// MULTER STORAGE
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      '-' +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname).toLowerCase();

    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024
  },

  // Only accept PDFs, Word documents and images
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ALLOWED_TYPES[file.mimetype] && ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(null, true);
    }

    const error = new Error('Only PDF, Word (.doc/.docx), JPG and PNG files are allowed');
    error.status = 400;
    cb(error);
  }
});

// Run multer and turn its errors into clean 400 responses
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();

    return res.status(400).json({
      message:
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File is too large (max 10 MB)'
          : err.message
    });
  });
};

const getFileType = (mimeType) => ALLOWED_TYPES[mimeType] || 'other';

const filePathFor = (doc) => path.join(UPLOAD_DIR, path.basename(doc.fileUrl || ''));

const parseTags = (tags) =>
  (Array.isArray(tags) ? tags : String(tags || '').split(','))
    .map((tag) => String(tag).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 15);

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ==========================================
// UPLOAD DOCUMENT
// ==========================================

router.post(
  '/upload',
  authMiddleware,
  handleUpload,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'Please select a file'
        });
      }

      const category = CATEGORIES.includes(req.body.category) ? req.body.category : 'other';

      const document = new Document({
        user: req.userId,

        title: (req.body.title || req.file.originalname).trim().slice(0, 150),

        fileName: req.file.originalname,

        // Stored for reference; files are served via GET /:id/file
        fileUrl: `/uploads/${req.file.filename}`,

        fileType: getFileType(req.file.mimetype),

        category,

        expiryDate: req.body.expiryDate
          ? new Date(req.body.expiryDate)
          : undefined,

        tags: parseTags(req.body.tags)
      });

      await document.save();

      res.status(201).json({
        message: 'Document uploaded successfully!',
        document
      });

    } catch (error) {
      console.error('Document upload error:', error);

      // Don't leave an orphaned file on disk if saving failed
      if (req.file) fs.promises.unlink(req.file.path).catch(() => {});

      res.status(500).json({
        message: 'Failed to upload document',
        error: error.message
      });
    }
  }
);

// ==========================================
// GET MY DOCUMENTS
// Optional: ?q=search text  &category=medical
// ==========================================

router.get('/', authMiddleware, async (req, res) => {
  try {
    const filter = { user: req.userId };

    if (req.query.category && CATEGORIES.includes(req.query.category)) {
      filter.category = req.query.category;
    }

    const query = req.query.q?.trim();
    if (query) {
      // Partial, case-insensitive match on title, file name and tags
      const regex = new RegExp(escapeRegex(query), 'i');
      filter.$or = [{ title: regex }, { fileName: regex }, { tags: regex }];
    }

    const documents = await Document
      .find(filter)
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
// SEARCH MY DOCUMENTS (kept for compatibility, same as GET /?q=)
// ==========================================

router.get('/search', authMiddleware, async (req, res) => {
  try {
    const query = req.query.q?.trim();
    const filter = { user: req.userId };

    if (query) {
      const regex = new RegExp(escapeRegex(query), 'i');
      filter.$or = [{ title: regex }, { fileName: regex }, { tags: regex }];
    }

    const documents = await Document.find(filter).sort({ uploadedAt: -1 });

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
// EXPIRING DOCUMENTS (next 30 days) + already expired
// ==========================================

router.get('/expiry', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [expiringSoon, expired] = await Promise.all([
      Document.find({
        user: req.userId,
        expiryDate: { $gte: now, $lte: thirtyDaysFromNow }
      }).sort({ expiryDate: 1 }),
      Document.find({
        user: req.userId,
        expiryDate: { $lt: now }
      }).sort({ expiryDate: -1 })
    ]);

    // Old clients expected a plain array of expiring docs
    if (req.query.legacy === '1') return res.json(expiringSoon);

    res.json({ expiringSoon, expired });

  } catch (error) {
    console.error('Expiry error:', error);

    res.status(500).json({
      message: 'Failed to fetch expiry information',
      error: error.message
    });
  }
});

// ==========================================
// DOWNLOAD / VIEW A FILE (owner only)
// ?download=1 forces a download instead of opening inline
// ==========================================

router.get('/:id/file', authMiddleware, async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, user: req.userId });

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const filePath = filePathFor(doc);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File is missing on the server' });
    }

    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    const safeName = (doc.fileName || path.basename(filePath)).replace(/["\r\n]/g, '');

    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`
    );

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// EDIT DOCUMENT DETAILS
// ==========================================

router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const update = {};

    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim();
      if (!title) return res.status(400).json({ message: 'Title cannot be empty' });
      update.title = title.slice(0, 150);
    }

    if (req.body.category !== undefined) {
      if (!CATEGORIES.includes(req.body.category)) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      update.category = req.body.category;
    }

    if (req.body.tags !== undefined) update.tags = parseTags(req.body.tags);

    if (req.body.expiryDate !== undefined) {
      update.expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : null;
    }

    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({ message: 'Document updated', document });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DELETE DOCUMENT (and its file)
// ==========================================

router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, user: req.userId });

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    await fs.promises.unlink(filePathFor(doc)).catch(() => {});

    res.json({ message: 'Document deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
