const { admin, getApp } = require('./firebase');

let bucket;

function getBucket() {
  if (!bucket) {
    const app = getApp();
    bucket = admin.storage(app).bucket();
  }
  return bucket;
}

/**
 * Upload a buffer to Firebase Storage and return the public URL.
 * @param {Buffer} buffer
 * @param {string} destination  e.g. 'scan/userId/timestamp_meal.jpg'
 * @param {string} mimetype
 * @returns {Promise<string>} public URL
 */
async function uploadBuffer(buffer, destination, mimetype) {
  const b = getBucket();
  const file = b.file(destination);
  await file.save(buffer, {
    metadata: { contentType: mimetype },
    resumable: false,
  });
  await file.makePublic();
  return `https://storage.googleapis.com/${b.name}/${destination}`;
}

module.exports = { uploadBuffer };
