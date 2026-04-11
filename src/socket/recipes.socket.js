const jwt = require('jsonwebtoken');
const config = require('../config');

function setupRecipesSocket(io) {
  const ns = io.of('/recipes');

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
    socket.on('subscribe:recipes', ({ requestId } = {}) => {
      if (!requestId) return;
      socket.join(`recipes:${requestId}`);
    });

    socket.on('disconnect', () => {});
  });

  return ns;
}

module.exports = setupRecipesSocket;
