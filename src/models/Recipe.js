const mongoose = require('mongoose');

const nutritionSchema = new mongoose.Schema(
  {
    calories: { type: Number },
    protein: { type: Number },
    carbs: { type: Number },
    fat: { type: Number },
    fiber: { type: Number },
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    ingredients: [{ type: String }],
    instructions: [{ type: String }],
    prepTimeMinutes: { type: Number },
    cookTimeMinutes: { type: Number },
    servings: { type: Number },
    imageUrl: { type: String },
    nutrition: nutritionSchema,
    dietaryTags: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    cuisineType: { type: String },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    source: { type: String, enum: ['manual', 'ai_generated'], default: 'manual' },
    isPublished: { type: Boolean, default: true },
    isTrending: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

recipeSchema.index({ title: 'text', description: 'text' });
recipeSchema.index({ isPublished: 1, isTrending: 1 });
recipeSchema.index({ dietaryTags: 1 });

module.exports = mongoose.model('Recipe', recipeSchema);
