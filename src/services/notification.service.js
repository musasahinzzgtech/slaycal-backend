const { admin, getApp } = require('./firebase');
const User = require('../models/User');

/**
 * Register or update the FCM token for a user.
 */
async function registerFcmToken(userId, { fcmToken, platform }) {
  await User.findByIdAndUpdate(userId, { fcmToken, fcmTokenPlatform: platform });
}

/**
 * Send a push notification to a single user by userId.
 * @param {string} userId
 * @param {{ title: string, body: string, data?: Record<string, string> }} payload
 */
async function sendToUser(userId, { title, body, data = {} }) {
  const user = await User.findById(userId).select('fcmToken').lean();
  if (!user?.fcmToken) {
    throw new Error('User has no FCM token registered');
  }
  return sendToToken(user.fcmToken, { title, body, data });
}

/**
 * Send a push notification directly to an FCM token.
 */
async function sendToToken(token, { title, body, data = {} }) {
  const app = getApp();
  const message = {
    token,
    notification: { title, body },
    data,
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  };
  const response = await admin.messaging(app).send(message);
  return response;
}

module.exports = { registerFcmToken, sendToUser, sendToToken };
