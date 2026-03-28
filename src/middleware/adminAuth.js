const User = require('../models/User');
const ApiError = require('../utils/ApiError');

async function adminAuth(req, res, next) {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user || !user.roles.includes('admin')) {
      return next(new ApiError(403, 'Admin access required', 'FORBIDDEN'));
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = adminAuth;
