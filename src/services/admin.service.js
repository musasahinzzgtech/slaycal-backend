const QuotaConfig = require('../models/QuotaConfig');
const Subscription = require('../models/Subscription');
const ApiError = require('../utils/ApiError');

function buildPagination(page, limit, total) {
  return { page, perPage: limit, total, totalPages: Math.ceil(total / limit) };
}

async function getQuotaConfigs() {
  return QuotaConfig.find().lean();
}

async function updateQuotaConfig({ id, data }) {
  const config = await QuotaConfig.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
  if (!config) throw new ApiError(404, 'Quota config not found', 'NOT_FOUND');
  return config;
}

async function getSubscriptions({ page = 1, limit = 20, tier }) {
  const skip = (page - 1) * limit;
  const filter = {};
  if (tier) filter.tier = tier;

  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter)
      .populate('user', 'email userType createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Subscription.countDocuments(filter),
  ]);

  return { subscriptions, pagination: buildPagination(page, limit, total) };
}

async function updateSubscriptionTier({ userId, tier }) {
  const subscription = await Subscription.findOneAndUpdate(
    { user: userId },
    { $set: { tier } },
    { new: true }
  ).lean();
  if (!subscription) throw new ApiError(404, 'Subscription not found', 'NOT_FOUND');
  return subscription;
}

async function grantTrial({ userId, days = 7 }) {
  const trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return Subscription.findOneAndUpdate(
    { user: userId },
    { $set: { tier: 'trial', trialEndsAt, isActive: true } },
    { new: true, upsert: true }
  ).lean();
}

module.exports = { getQuotaConfigs, updateQuotaConfig, getSubscriptions, updateSubscriptionTier, grantTrial };
