const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 50
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6
    },

    profilePicture: {
      type: String,
      default: ''
    },

    nutritionGoals: {
      calories: {
        type: Number,
        default: 2000,
        min: 0
      },
      protein: {
        type: Number,
        default: 100,
        min: 0
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);