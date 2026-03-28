const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    tier: { type: String, enum: ['free', 'premium', 'trial'], default: 'free' },
    isActive: { type: Boolean, default: true },
    trialEndsAt: { type: Date },
    currentPeriodEnd: { type: Date },
    appleTransactionId: { type: String },
    appleProductId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
