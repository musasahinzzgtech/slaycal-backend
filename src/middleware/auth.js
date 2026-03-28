const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../utils/ApiError');

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'No token provided', 'UNAUTHORIZED'));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = { id: payload.id, type: payload.type, roles: payload.roles || ['user'] };
    return next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired token', 'UNAUTHORIZED'));
  }
}

module.exports = auth;
