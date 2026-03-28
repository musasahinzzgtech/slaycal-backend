const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/admin.controller');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const validate = require('../middleware/validate');

const router = express.Router();

const quotaUpdateSchema = z.object({
  dailyLimit: z.number().optional(),
  isActive: z.boolean().optional(),
});

const tierSchema = z.object({ tier: z.enum(['free', 'premium', 'trial']) });

// All admin routes require JWT + admin role
router.use(auth, adminAuth);

router.get('/quota/configs', controller.getQuotaConfigs);
router.patch('/quota/configs/:id', validate(quotaUpdateSchema), controller.updateQuotaConfig);

router.get('/subscriptions', controller.getSubscriptions);
router.patch('/subscriptions/:userId/tier', validate(tierSchema), controller.updateSubscriptionTier);
router.post('/subscriptions/:userId/trial', controller.grantTrial);

module.exports = router;
