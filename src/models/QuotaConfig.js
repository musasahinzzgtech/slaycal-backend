const mongoose = require('mongoose');

const quotaConfigSchema = new mongoose.Schema(
  {
    feature: { type: String, required: true, unique: true },
    dailyLimit: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuotaConfig', quotaConfigSchema);
