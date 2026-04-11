const jwt = require('jsonwebtoken');
const config = require('../config');
const ImageJob = require('../models/ImageJob');

function setupRecognitionSocket(io) {
  const ns = io.of('/recognition');

  ns.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const payload = jwt.verify(token, config.jwt.secret);
      socket.userId = payload.id;
      return next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  ns.on('connection', (socket) => {
    socket.on('subscribe:recognition', async ({ jobId } = {}) => {
      if (!jobId) return;
      try {
        const job = await ImageJob.findById(jobId).lean();
        if (!job || job.user.toString() !== socket.userId) return;
        socket.join(`recognition:${jobId}`);

        // If already finished by the time the client subscribes, emit immediately
        if (job.status === 'completed') {
          socket.emit('recognition:completed', { jobId, detectionResults: job.detectionResults });
        } else if (job.status === 'failed') {
          socket.emit('recognition:error', { jobId, message: job.errorMessage });
        }
      } catch {
        // ignore
      }
    });

    socket.on('disconnect', () => {});
  });

  return ns;
}

module.exports = setupRecognitionSocket;
