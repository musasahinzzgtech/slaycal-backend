const mongoose = require('mongoose');

/**
 * Stores per-(feature, tier) daily limit overrides.
 * If no document exists for a (feature, tier) pair the quota.service
 * falls back to the TIER_DEFAULTS constant defined there.
 */
const quotaConfigSchema = new mongoose.Schema(
  {
    feature: { type: String, required: true, trim: true },
    tier: { type: String, enum: ['free', 'premium', 'trial'], required: true },
    dailyLimit: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Each (feature, tier) pair must be unique
quotaConfigSchema.index({ feature: 1, tier: 1 }, { unique: true });

module.exports = mongoose.model('QuotaConfig', quotaConfigSchema);
