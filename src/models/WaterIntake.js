const mongoose = require('mongoose');

const waterIntakeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountMl: { type: Number, required: true },
    loggedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

waterIntakeSchema.index({ user: 1, loggedAt: -1 });

module.exports = mongoose.model('WaterIntake', waterIntakeSchema);
