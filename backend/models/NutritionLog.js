const mongoose = require('mongoose');

const nutritionLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], required: true },
  foodName: { type: String, required: true },
  calories: Number,
  protein: Number, // grams
  carbs: Number,   // grams
  fat: Number,     // grams
  imageUrl: String,
  date: { type: Date, default: Date.now }
});

nutritionLogSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('NutritionLog', nutritionLogSchema);