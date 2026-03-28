const scanService = require('../services/scan.service');
const ApiError = require('../utils/ApiError');

async function uploadScan(req, res, next) {
  try {
    if (!req.file) throw new ApiError(400, 'Image file required', 'NO_FILE');
    const result = await scanService.uploadScan({ userId: req.user.id, file: req.file });
    return res.status(201).json({ data: result });
  } catch (err) {
    return next(err);
  }
}

module.exports = { uploadScan };
