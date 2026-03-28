const mongoose = require('mongoose');

const surveyResponseSchema = new mongoose.Schema(
  {
    questionKey: { type: String, required: true },
    answers: { type: [String], default: [] },
  },
  { _id: false }
);

const userPreferenceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Personal details
    gender: { type: String, enum: ['male', 'female', 'other', null], default: null },
    age: { type: Number },
    heightCm: { type: Number },
    weightKg: { type: Number },
    goalWeightKg: { type: Number },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active', 'very_active', null],
      default: null,
    },
    goalType: {
      type: String,
      enum: ['lose_weight', 'maintain', 'gain_muscle', null],
      default: null,
    },

    // Dietary
    dietaryPreferences: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    cuisinePreferences: { type: [String], default: [] },

    // Calculated targets
    dailyCalorieTarget: { type: Number },
    dailyProteinTarget: { type: Number },
    dailyCarbsTarget: { type: Number },
    dailyFatTarget: { type: Number },
    dailyWaterGoalMl: { type: Number },

    // Survey raw responses
    surveyResponses: [surveyResponseSchema],
    surveyCompletedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserPreference', userPreferenceSchema);
