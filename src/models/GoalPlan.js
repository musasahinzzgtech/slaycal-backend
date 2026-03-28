const mongoose = require('mongoose');

const goalPlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    effectiveFrom: { type: Date, default: Date.now },
    targetWeightKg: { type: Number },
    targetCalories: { type: Number },
    targetProteinG: { type: Number },
    targetCarbsG: { type: Number },
    targetFatG: { type: Number },
    targetWaterMl: { type: Number },
  },
  { timestamps: true }
);

goalPlanSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('GoalPlan', goalPlanSchema);
