const recognitionService = require('../services/recognition.service');
const ApiError = require('../utils/ApiError');

async function uploadImage(req, res, next) {
  try {
    if (!req.file) throw new ApiError(400, 'Image file required', 'NO_FILE');
    const language = req.get('Accept-Language')?.split(',')[0]?.split('-')[0]?.trim() || 'en';
    const result = await recognitionService.uploadImage({ userId: req.user.id, file: req.file, language });
    return res.status(201).json({ data: result });
  } catch (err) {
    return next(err);
  }
}

async function getJob(req, res, next) {
  try {
    const result = await recognitionService.getJob({ userId: req.user.id, jobId: req.params.jobId });
    return res.json({ data: result });
  } catch (err) {
    return next(err);
  }
}

module.exports = { uploadImage, getJob };
