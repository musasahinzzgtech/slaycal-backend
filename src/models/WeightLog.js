const mongoose = require('mongoose');

const weightLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weightKg: { type: Number, required: true },
    note: { type: String },
    loggedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

weightLogSchema.index({ user: 1, loggedAt: -1 });

module.exports = mongoose.model('WeightLog', weightLogSchema);
