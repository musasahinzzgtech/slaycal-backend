const ImageJob = require('../models/ImageJob');
const storageService = require('./storage.service');
const quotaService = require('./quota.service');
const openaiService = require('./openai.service');
const ApiError = require('../utils/ApiError');

let _io = null;
function setIo(io) { _io = io; }
function emitToRecognition(jobId, event, data) {
  if (_io) _io.of('/recognition').to(`recognition:${jobId}`).emit(event, data);
}

async function uploadImage({ userId, file, language = 'en' }) {
  await quotaService.check(userId, 'ai_scan');

  const timestamp = Date.now();
  const filename = file.originalname || 'image.jpg';
  const destination = `recognition/${userId}/${timestamp}_${filename}`;

  const imageUrl = await storageService.uploadBuffer(file.buffer, destination, file.mimetype);

  const job = await ImageJob.create({
    user: userId,
    status: 'pending',
    imageUrl,
    firebasePath: destination,
    language,
  });

  // Fire-and-forget
  processImage(job._id.toString()).catch(console.error);

  return { jobId: job._id, status: job.status };
}

async function getJob({ userId, jobId }) {
  const job = await ImageJob.findById(jobId).lean();
  if (!job) throw new ApiError(404, 'Job not found', 'NOT_FOUND');
  if (job.user.toString() !== userId) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');

  return {
    jobId: job._id,
    status: job.status,
    detectionResults: job.detectionResults,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  };
}

async function processImage(jobId) {
  const job = await ImageJob.findById(jobId);
  if (!job) return;

  try {
    job.status = 'processing';
    await job.save();

    emitToRecognition(jobId, 'recognition:progress', { jobId, progress: 30, message: 'Analyzing image...' });

    const ingredients = await openaiService.recognizeIngredients(job.imageUrl, job.language || 'en');
    job.detectionResults = ingredients;
    job.status = 'completed';
    job.completedAt = new Date();
    await job.save();

    emitToRecognition(jobId, 'recognition:completed', {
      jobId,
      detectionResults: job.detectionResults,
    });
  } catch (err) {
    job.status = 'failed';
    job.errorMessage = err.message;
    await job.save();

    emitToRecognition(jobId, 'recognition:error', { jobId, message: err.message });
  }
}

module.exports = { uploadImage, getJob, processImage, setIo };
