const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const ApiError = require("../utils/ApiError");

function signTokens(user) {
  const payload = {
    id: user._id.toString(),
    type: user.userType,
    roles: user.roles,
  };
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiration,
  });
  const refreshToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiration,
  });
  return { accessToken, refreshToken };
}

async function initAnonymous({ deviceId, platform, appVersion }) {
  console.log("initAnonymous", deviceId, platform, appVersion);
  let user = await User.findOne({ deviceId, userType: "anonymous" });
  const isNewDevice = !user;

  if (!user) {
    user = await User.create({
      deviceId,
      platform,
      appVersion,
      userType: "anonymous",
    });
    await Subscription.create({ user: user._id, tier: "free" });
  }

  const payload = {
    id: user._id.toString(),
    type: "anonymous",
    roles: user.roles,
  };
  const anonymousToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiration,
  });

  return {
    anonymousToken,
    grantType: "anonymous",
    credits: 0,
    isNewUser: isNewDevice,
    isNewDevice,
    user: { id: user._id, userType: user.userType, locale: user.locale },
  };
}

async function register({ email, password }) {
  const existing = await User.findOne({ email });
  if (existing)
    throw new ApiError(409, "Email already registered", "DUPLICATE_EMAIL");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email,
    passwordHash,
    userType: "registered",
  });
  await Subscription.create({ user: user._id, tier: "free" });

  const { accessToken, refreshToken } = signTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      locale: user.locale,
    },
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user || !user.passwordHash) {
    throw new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid)
    throw new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");

  const { accessToken, refreshToken } = signTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      locale: user.locale,
    },
  };
}

async function registerAdmin({ email, password }) {
  const existing = await User.findOne({ email });
  if (existing)
    throw new ApiError(409, "Email already registered", "DUPLICATE_EMAIL");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email,
    passwordHash,
    userType: "registered",
    roles: ["admin"],
  });
  await Subscription.create({ user: user._id, tier: "free" });

  const { accessToken, refreshToken } = signTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      locale: user.locale,
    },
  };
}

async function logout(userId) {
  await User.findByIdAndUpdate(userId, { $unset: { refreshToken: "" } });
}

module.exports = { initAnonymous, register, registerAdmin, login, logout };
