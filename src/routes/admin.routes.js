const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/admin.controller');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const validate = require('../middleware/validate');

const router = express.Router();

// ─── Validation schemas ───────────────────────────────────────────────────────

const quotaUpsertSchema = z.object({
  dailyLimit: z.number().int().min(0),
  isActive: z.boolean().optional(),
});

const tierSchema = z.object({ tier: z.enum(['free', 'premium', 'trial']) });

const VALID_TIERS = ['free', 'premium', 'trial'];

// All admin routes require JWT + admin role
router.use(auth, adminAuth);

// ─── Quota config routes ──────────────────────────────────────────────────────

/**
 * GET /admin/quota/configs
 * Returns merged view of code defaults + any DB overrides.
 */
router.get('/quota/configs', controller.getQuotaConfigs);

/**
 * PUT /admin/quota/configs/:feature/:tier
 * Creates or replaces the daily limit override for a (feature, tier) pair.
 * :tier must be one of free | premium | trial
 */
router.put(
  '/quota/configs/:feature/:tier',
  (req, res, next) => {
    if (!VALID_TIERS.includes(req.params.tier)) {
      return res.status(400).json({ error: { message: 'Invalid tier', code: 'VALIDATION_ERROR' } });
    }
    return next();
  },
  validate(quotaUpsertSchema),
  controller.upsertQuotaConfig
);

/**
 * DELETE /admin/quota/configs/:feature/:tier
 * Removes the DB override, reverting to the code default.
 */
router.delete('/quota/configs/:feature/:tier', controller.deleteQuotaConfig);

/**
 * GET /admin/quota/usage/:userId
 * Returns today's Redis usage counters for the given user.
 */
router.get('/quota/usage/:userId', controller.getUserQuotaUsage);

// ─── Subscription routes ──────────────────────────────────────────────────────

router.get('/subscriptions', controller.getSubscriptions);
router.patch('/subscriptions/:userId/tier', validate(tierSchema), controller.updateSubscriptionTier);
router.post('/subscriptions/:userId/trial', controller.grantTrial);

module.exports = router;
