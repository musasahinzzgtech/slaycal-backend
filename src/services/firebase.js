const admin = require('firebase-admin');
const config = require('../config');

function getApp() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey,
        clientEmail: config.firebase.clientEmail,
      }),
      storageBucket: config.firebase.storageBucket,
    });
  }
  return admin.app();
}

module.exports = { admin, getApp };
