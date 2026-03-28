const mongoose = require('mongoose');

const scanResultSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    type: { type: String, enum: ['food', 'ingredient'], default: 'food' },
    imageUrl: { type: String },
    firebasePath: { type: String },
    nutrition: {
      calories: { type: Number },
      protein: { type: Number },
      carbs: { type: Number },
      fat: { type: Number },
      fiber: { type: Number },
    },
    foodName: { type: String },
    errorMessage: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

scanResultSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ScanResult', scanResultSchema);
