const adminService = require('../services/admin.service');

// ─── Quota ────────────────────────────────────────────────────────────────────

async function getQuotaConfigs(req, res, next) {
  try {
    const configs = await adminService.getQuotaConfigs();
    return res.json({ data: { configs } });
  } catch (err) {
    return next(err);
  }
}

async function upsertQuotaConfig(req, res, next) {
  try {
    const { feature, tier } = req.params;
    const { dailyLimit, isActive } = req.body;
    const config = await adminService.upsertQuotaConfig({ feature, tier, dailyLimit, isActive });
    return res.json({ data: { config } });
  } catch (err) {
    return next(err);
  }
}

async function deleteQuotaConfig(req, res, next) {
  try {
    const { feature, tier } = req.params;
    await adminService.deleteQuotaConfig({ feature, tier });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function getUserQuotaUsage(req, res, next) {
  try {
    const usage = await adminService.getUserQuotaUsage(req.params.userId);
    return res.json({ data: { usage } });
  } catch (err) {
    return next(err);
  }
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

async function getSubscriptions(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const result = await adminService.getSubscriptions({ page, limit, tier: req.query.tier });
    return res.json({ data: result });
  } catch (err) {
    return next(err);
  }
}

async function updateSubscriptionTier(req, res, next) {
  try {
    const subscription = await adminService.updateSubscriptionTier({
      userId: req.params.userId,
      tier: req.body.tier,
    });
    return res.json({ data: { subscription } });
  } catch (err) {
    return next(err);
  }
}

async function grantTrial(req, res, next) {
  try {
    const subscription = await adminService.grantTrial({
      userId: req.params.userId,
      days: req.body.days,
    });
    return res.json({ data: { subscription } });
  } catch (err) {
    return next(err);
  }
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
