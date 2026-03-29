const userService = require('../services/user.service');
const notificationService = require('../services/notification.service');

async function getPersonalDetails(req, res, next) {
  try {
    const personalDetails = await userService.getPersonalDetails(req.user.id);
    return res.json({ data: { personalDetails } });
  } catch (err) {
    return next(err);
  }
}

async function updatePersonalDetails(req, res, next) {
  try {
    const personalDetails = await userService.updatePersonalDetails(req.user.id, req.body);
    return res.json({ data: { personalDetails } });
  } catch (err) {
    return next(err);
  }
}

async function registerFcmToken(req, res, next) {
  try {
    const { fcmToken, platform } = req.body;
    await notificationService.registerFcmToken(req.user.id, { fcmToken, platform });
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getPersonalDetails, updatePersonalDetails, registerFcmToken };
