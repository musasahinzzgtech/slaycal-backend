const bcrypt = require('bcryptjs');
const SurveyQuestion = require('../models/SurveyQuestion');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const ApiError = require('../utils/ApiError');

// ── Survey Questions ──────────────────────────────────────────────────────────

async function listSurveyQuestions() {
  const docs = await SurveyQuestion.find().sort({ displayOrder: 1 }).lean();
  // lean() returns Map fields as plain JS Map objects; convert to plain object for JSON
  return docs.map((q) => ({
    ...q,
    titleI18n: q.titleI18n instanceof Map
      ? Object.fromEntries(q.titleI18n)
      : (q.titleI18n || {}),
  }));
}

async function createSurveyQuestion(data) {
  const doc = await SurveyQuestion.create(data);
  return doc.toObject();
}

async function updateSurveyQuestion(id, data) {
  const doc = await SurveyQuestion.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
  if (!doc) throw new ApiError(404, 'Survey question not found', 'NOT_FOUND');
  return doc;
}

// Hard delete — admin-managed records; no need for soft delete here.
async function deleteSurveyQuestion(id) {
  const doc = await SurveyQuestion.findByIdAndDelete(id).lean();
  if (!doc) throw new ApiError(404, 'Survey question not found', 'NOT_FOUND');
}

// ── Users ─────────────────────────────────────────────────────────────────────

const USER_SAFE_FIELDS = '_id email firstName lastName userType roles createdAt';
const MAX_LIMIT = 100;

async function listUsers({ page = 1, limit = 20 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), MAX_LIMIT);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [users, total] = await Promise.all([
    User.find().select(USER_SAFE_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    User.countDocuments(),
  ]);

  return {
    users,
    pagination: {
      page: safePage,
      perPage: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

async function createUser({ email, password, firstName, lastName, userType, roles }) {
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already registered', 'DUPLICATE_EMAIL');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, firstName, lastName, userType, roles: roles || ['user'] });
  await Subscription.create({ user: user._id, tier: 'free' });

  return user.toObject();
}

async function updateUser(id, { email, firstName, lastName, userType, roles }) {
  const updates = {};
  if (email !== undefined) updates.email = email;
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (userType !== undefined) updates.userType = userType;
  if (roles !== undefined) updates.roles = roles;

  const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).lean();
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');
  return user;
}

async function deleteUser(id) {
  const user = await User.findByIdAndDelete(id).lean();
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');
}

module.exports = {
  listSurveyQuestions,
  createSurveyQuestion,
  updateSurveyQuestion,
  deleteSurveyQuestion,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
