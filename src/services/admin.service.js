const QuotaConfig = require('../models/QuotaConfig');
const Subscription = require('../models/Subscription');
const quotaService = require('./quota.service');
const ApiError = require('../utils/ApiError');

function buildPagination(page, limit, total) {
  return { page, perPage: limit, total, totalPages: Math.ceil(total / limit) };
}

// ─── Quota ────────────────────────────────────────────────────────────────────

/**
 * Returns a merged view of all (feature, tier) quota limits:
 * - code defaults from TIER_DEFAULTS
 * - overridden by any active QuotaConfig documents
 */
async function getQuotaConfigs() {
  const overrides = await QuotaConfig.find().lean();
  const overrideMap = {};
  for (const o of overrides) {
    overrideMap[`${o.feature}:${o.tier}`] = o;
  }

  const defaults = quotaService.TIER_DEFAULTS;
  const rows = [];

  for (const [tier, features] of Object.entries(defaults)) {
    for (const [feature, defaultLimit] of Object.entries(features)) {
      const key = `${feature}:${tier}`;
      if (overrideMap[key]) {
        rows.push({ ...overrideMap[key], isOverride: true });
      } else {
        rows.push({ feature, tier, dailyLimit: defaultLimit, isActive: true, isOverride: false });
      }
    }
  }

  // Append any DB overrides for features not in TIER_DEFAULTS
  for (const o of overrides) {
    const key = `${o.feature}:${o.tier}`;
    const alreadyIncluded = rows.some((r) => r.feature === o.feature && r.tier === o.tier);
    if (!alreadyIncluded) rows.push({ ...o, isOverride: true });
  }

  return rows;
}

/**
 * Creates or updates the DB override for a (feature, tier) pair.
 */
async function upsertQuotaConfig({ feature, tier, dailyLimit, isActive }) {
  const config = await QuotaConfig.findOneAndUpdate(
    { feature, tier },
    { $set: { dailyLimit, ...(isActive !== undefined && { isActive }) } },
    { new: true, upsert: true, runValidators: true }
  ).lean();
  return config;
}

/**
 * Removes a DB override, reverting the pair to its code default.
 */
async function deleteQuotaConfig({ feature, tier }) {
  const result = await QuotaConfig.findOneAndDelete({ feature, tier }).lean();
  if (!result) throw new ApiError(404, 'Quota override not found', 'NOT_FOUND');
  return result;
}

/**
 * Returns today's Redis usage for a specific user across all features.
 */
async function getUserQuotaUsage(userId) {
  return quotaService.getUsage(userId);
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

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

module.exports = {
  getQuotaConfigs,
  upsertQuotaConfig,
  deleteQuotaConfig,
  getUserQuotaUsage,
  getSubscriptions,
  updateSubscriptionTier,
  grantTrial,
};
