const Subscription = require('../models/Subscription');
const QuotaConfig = require('../models/QuotaConfig');
const { getClient } = require('./redis');
const ApiError = require('../utils/ApiError');

// ─── Default daily limits per tier per feature ────────────────────────────────
// These are used when no QuotaConfig document exists for a (feature, tier) pair.
// Admins can override any cell via PATCH /admin/quota/configs/:feature/:tier.
const TIER_DEFAULTS = {
  free: {
    scan: 3,
    recognition: 5,
    ai_recipe: 2,
  },
  trial: {
    scan: 10,
    recognition: 15,
    ai_recipe: 5,
  },
  premium: {
    scan: 100,
    recognition: 100,
    ai_recipe: 50,
  },
};

// ─── Lua script: atomic INCR + conditional EXPIREAT ───────────────────────────
// Increments the counter and sets it to expire at midnight UTC on the first
// write of the day (count === 1). All operations are atomic inside Redis.
//
// KEYS[1] = Redis key  (e.g. "quota:userId:scan:20260411")
// ARGV[1] = daily limit (integer)
// ARGV[2] = UNIX timestamp of tomorrow midnight UTC
//
// Returns the NEW counter value after increment.
const INCR_SCRIPT = `
local key    = KEYS[1]
local expAt  = tonumber(ARGV[1])
local count  = redis.call('INCR', key)
if count == 1 then
  redis.call('EXPIREAT', key, expAt)
end
return count
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the UNIX timestamp of tomorrow 00:00:00 UTC. */
function tomorrowMidnightUnix() {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

/** Returns today as a compact date string, e.g. "20260411". */
function todayDateStr() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

/** Resolves the active subscription tier for a user. Expired trials fall back to 'free'. */
async function getUserTier(userId) {
  const sub = await Subscription.findOne({ user: userId, isActive: true })
    .select('tier trialEndsAt')
    .lean();

  if (!sub) return 'free';

  if (sub.tier === 'trial' && sub.trialEndsAt && sub.trialEndsAt < new Date()) {
    return 'free';
  }

  return sub.tier;
}

/**
 * Returns the daily limit for a (feature, tier) pair.
 * DB override wins over TIER_DEFAULTS.
 * Returns null to indicate "unlimited".
 */
async function getLimit(feature, tier) {
  const override = await QuotaConfig.findOne({ feature, tier, isActive: true }).lean();
  if (override) return override.dailyLimit;

  return TIER_DEFAULTS[tier]?.[feature] ?? null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Atomically increments the user's daily usage counter in Redis and throws
 * a 429 ApiError if the limit for their subscription tier is exceeded.
 *
 * @param {string} userId  - MongoDB ObjectId as string
 * @param {string} feature - e.g. 'scan', 'recognition', 'ai_recipe'
 */
async function check(userId, feature) {
  const tier = await getUserTier(userId);
  const limit = await getLimit(feature, tier);

  if (limit === null) return; // unlimited for this tier/feature

  const key = `quota:${userId}:${feature}:${todayDateStr()}`;
  const redis = getClient();

  const count = await redis.eval(INCR_SCRIPT, 1, key, tomorrowMidnightUnix());

  if (count > limit) {
    throw new ApiError(
      429,
      `Daily ${feature} limit of ${limit} reached for your ${tier} plan`,
      'QUOTA_EXCEEDED'
    );
  }
}

/**
 * Returns the current-day usage for every feature that has a Redis counter
 * for this user. Useful for client-side quota display and admin tooling.
 *
 * @param {string} userId
 * @returns {Record<string, number>}  e.g. { scan: 2, recognition: 4 }
 */
async function getUsage(userId) {
  const redis = getClient();
  const today = todayDateStr();
  const pattern = `quota:${userId}:*:${today}`;

  const keys = await redis.keys(pattern);
  if (!keys.length) return {};

  const values = await redis.mget(...keys);
  const usage = {};
  keys.forEach((key, i) => {
    // key format: quota:{userId}:{feature}:{date}
    const feature = key.split(':')[2];
    usage[feature] = parseInt(values[i], 10) || 0;
  });
  return usage;
}

module.exports = { check, getUsage, getUserTier, TIER_DEFAULTS };
