const mongoose = require('mongoose');

const imageJobSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    imageUrl: { type: String },
    firebasePath: { type: String },
    detectionResults: [
      {
        ingredientName: { type: String },
        confidence: { type: Number },
        _id: false,
      },
    ],
    language: { type: String, default: 'en' },
    errorMessage: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

imageJobSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ImageJob', imageJobSchema);
