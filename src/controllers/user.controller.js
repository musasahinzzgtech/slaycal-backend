const notificationService = require("../services/notification.service");

async function registerFcmToken(req, res, next) {
  try {
    const { fcmToken, platform } = req.body;
    await notificationService.registerFcmToken(req.user.id, {
      fcmToken,
      platform,
    });
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { registerFcmToken };
