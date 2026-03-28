const ScanResult = require('../models/ScanResult');
const storageService = require('./storage.service');
const quotaService = require('./quota.service');
const openaiService = require('./openai.service');
const ApiError = require('../utils/ApiError');

let _io = null;
function setIo(io) { _io = io; }

function emitToScan(scanId, event, data) {
  if (_io) _io.of('/scan').to(`scan:${scanId}`).emit(event, data);
}

async function uploadScan({ userId, file }) {
  await quotaService.check(userId, 'scan');

  const timestamp = Date.now();
  const filename = file.originalname || 'meal.jpg';
  const destination = `scan/${userId}/${timestamp}_${filename}`;

  const imageUrl = await storageService.uploadBuffer(file.buffer, destination, file.mimetype);

  const scan = await ScanResult.create({
    user: userId,
    status: 'pending',
    type: 'food',
    imageUrl,
    firebasePath: destination,
  });

  // Fire-and-forget
  processScan(scan._id.toString()).catch(console.error);

  return { scanId: scan._id, status: scan.status };
}

async function processScan(scanId) {
  const scan = await ScanResult.findById(scanId);
  if (!scan) return;

  try {
    scan.status = 'processing';
    await scan.save();

    emitToScan(scanId, 'scan:progress', { scanId, progress: 30, message: 'Analyzing image...' });

    const result = await openaiService.analyzeFoodImage(scan.imageUrl);
    scan.nutrition = result.nutrition;
    scan.foodName = result.foodName;
    scan.status = 'completed';
    scan.completedAt = new Date();
    await scan.save();

    emitToScan(scanId, 'scan:completed', {
      scanId,
      nutrition: scan.nutrition,
      foodName: scan.foodName,
    });
  } catch (err) {
    scan.status = 'failed';
    scan.errorMessage = err.message;
    await scan.save();

    emitToScan(scanId, 'scan:error', { scanId, error: err.message });
  }
}

module.exports = { uploadScan, processScan, setIo };
