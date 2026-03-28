const ImageJob = require('../models/ImageJob');
const storageService = require('./storage.service');
const quotaService = require('./quota.service');
const openaiService = require('./openai.service');
const ApiError = require('../utils/ApiError');

async function uploadImage({ userId, file }) {
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

    const ingredients = await openaiService.recognizeIngredients(job.imageUrl);
    job.detectionResults = ingredients;
    job.status = 'completed';
    job.completedAt = new Date();
    await job.save();
  } catch (err) {
    job.status = 'failed';
    job.errorMessage = err.message;
    await job.save();
  }
}

module.exports = { uploadImage, getJob, processImage };
