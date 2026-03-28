const adminService = require('../services/admin.service');

async function getQuotaConfigs(req, res, next) {
  try {
    const configs = await adminService.getQuotaConfigs();
    return res.json({ data: { configs } });
  } catch (err) {
    return next(err);
  }
}

async function updateQuotaConfig(req, res, next) {
  try {
    const quotaConfig = await adminService.updateQuotaConfig({ id: req.params.id, data: req.body });
    return res.json({ data: { quotaConfig } });
  } catch (err) {
    return next(err);
  }
}

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

module.exports = { getQuotaConfigs, updateQuotaConfig, getSubscriptions, updateSubscriptionTier, grantTrial };
