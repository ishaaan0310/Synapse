const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  profilePicture: {
    type: String,
    default: ''
  },

  // ==============================
  // DAILY NUTRITION GOALS
  // ==============================

  nutritionGoals: {
    calories: {
      type: Number,
      default: 2000
    },

    protein: {
      type: Number,
      default: 100
    }
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);