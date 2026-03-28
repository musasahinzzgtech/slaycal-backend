const authService = require('../services/auth.service');

async function initAnonymous(req, res, next) {
  try {
    const result = await authService.initAnonymous(req.body);
    return res.status(201).json({ data: result });
  } catch (err) {
    return next(err);
  }
}

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json({ data: result });
  } catch (err) {
    return next(err);
  }
}

async function registerAdmin(req, res, next) {
  try {
    const result = await authService.registerAdmin(req.body);
    return res.status(201).json({ data: result });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return res.json({ data: result });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.user.id);
    return res.json({ message: 'Logged out' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { initAnonymous, register, registerAdmin, login, logout };
