const jwt = require('jsonwebtoken');
const config = require('../config');
const ScanResult = require('../models/ScanResult');

function setupScanSocket(io) {
  const scanNs = io.of('/scan');

  // JWT auth for socket connections
  scanNs.use((socket, next) => {
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

  scanNs.on('connection', (socket) => {
    const userId = socket.userId;
    // Join user's personal room
    socket.join(`scan:${userId}`);

    socket.on('subscribe:scan', async ({ scanId } = {}) => {
      if (!scanId) return;
      try {
        const scan = await ScanResult.findById(scanId).lean();
        if (!scan || scan.user.toString() !== userId) return;
        socket.join(`scan:${scanId}`);

        // If already completed, emit immediately
        if (scan.status === 'completed') {
          socket.emit('scan:completed', {
            scanId,
            nutrition: scan.nutrition,
            foodName: scan.foodName,
          });
        } else if (scan.status === 'failed') {
          socket.emit('scan:error', { scanId, error: scan.errorMessage });
        }
      } catch {
        // ignore
      }
    });

    socket.on('disconnect', () => {});
  });

  return scanNs;
}

module.exports = setupScanSocket;
