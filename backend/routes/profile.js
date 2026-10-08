const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const User = require('../models/User');
const HealthMetric = require('../models/HealthMetrics');
const NutritionLog = require('../models/NutritionLog');
const AcademicGoal = require('../models/AcademicGoal');
const Document = require('../models/Document');
const ChatMessage = require('../models/ChatMessage');
const DigitalTwinProfile = require('../models/DigitalTwinProfile');
const authMiddleware = require('../middleware/authMiddleware');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

router.use(authMiddleware);

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  nutritionGoals: user.nutritionGoals,
  createdAt: user.createdAt
});

// ==========================================
// GET MY PROFILE (+ quick stats)
// ==========================================

router.get('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [healthLogs, meals, goals, documents, messages] = await Promise.all([
      HealthMetric.countDocuments({ user: req.userId }),
      NutritionLog.countDocuments({ user: req.userId }),
      AcademicGoal.countDocuments({ user: req.userId }),
      Document.countDocuments({ user: req.userId }),
      ChatMessage.countDocuments({ user: req.userId })
    ]);

    res.json({
      success: true,
      user: publicUser(user),
      stats: { healthLogs, meals, goals, documents, messages }
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// UPDATE NAME
// ==========================================

router.put('/', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();

    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 50 characters'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { name } },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated',
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// CHANGE PASSWORD
// ==========================================

router.put('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);

    if (!matches) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// EXPORT ALL MY DATA (JSON)
// ==========================================

router.get('/export', async (req, res, next) => {
  try {
    const [user, health, nutrition, academic, documents, chat] = await Promise.all([
      User.findById(req.userId).select('-password').lean(),
      HealthMetric.find({ user: req.userId }).sort({ date: -1 }).lean(),
      NutritionLog.find({ user: req.userId }).sort({ date: -1 }).lean(),
      AcademicGoal.find({ user: req.userId }).sort({ deadline: 1 }).lean(),
      Document.find({ user: req.userId }).select('-ocrText').sort({ uploadedAt: -1 }).lean(),
      ChatMessage.find({ user: req.userId }).sort({ timestamp: 1 }).lean()
    ]);

    const fileName = `synapse-export-${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.json({
      exportedAt: new Date().toISOString(),
      user,
      health,
      nutrition,
      academic,
      documents,
      chat
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DELETE ACCOUNT (requires password)
// ==========================================

router.delete('/', async (req, res, next) => {
  try {
    const { password } = req.body || {};

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    // Remove uploaded files from disk
    const docs = await Document.find({ user: req.userId }).select('fileUrl');
    docs.forEach((doc) => {
      const filePath = path.join(UPLOAD_DIR, path.basename(doc.fileUrl || ''));
      fs.promises.unlink(filePath).catch(() => {});
    });

    await Promise.all([
      HealthMetric.deleteMany({ user: req.userId }),
      NutritionLog.deleteMany({ user: req.userId }),
      AcademicGoal.deleteMany({ user: req.userId }),
      Document.deleteMany({ user: req.userId }),
      ChatMessage.deleteMany({ user: req.userId }),
      DigitalTwinProfile.deleteMany({ user: req.userId }),
      User.deleteOne({ _id: req.userId })
    ]);

    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
