const QuotaConfig = require('../models/QuotaConfig');
const ApiError = require('../utils/ApiError');

// Simple in-process daily usage counter.
// For multi-instance prod, replace with Redis.
const usageMap = new Map(); // key: `${userId}:${feature}:${YYYYMMDD}` → count

function todayKey() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

async function check(userId, feature) {
  const config = await QuotaConfig.findOne({ feature, isActive: true }).lean();
  if (!config) return; // no quota configured → unlimited

  const key = `${userId}:${feature}:${todayKey()}`;
  const count = usageMap.get(key) || 0;

  if (count >= config.dailyLimit) {
    throw new ApiError(429, 'Daily quota exceeded', 'QUOTA_EXCEEDED');
  }

  usageMap.set(key, count + 1);
}

module.exports = { check };
