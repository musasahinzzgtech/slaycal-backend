const Recipe = require('../models/Recipe');
const UserPreference = require('../models/UserPreference');
const openaiService = require('./openai.service');

function buildPagination(page, perPage, total) {
  return { page, perPage, total, totalPages: Math.ceil(total / perPage) };
}

async function getRecipes({ page = 1, perPage = 20, title, description, isTrending }) {
  const skip = (page - 1) * perPage;
  const filter = { isPublished: true };

  if (isTrending === 'true' || isTrending === true) filter.isTrending = true;
  if (title) filter.title = { $regex: title, $options: 'i' };
  if (description) filter.description = { $regex: description, $options: 'i' };

  const [recipes, total] = await Promise.all([
    Recipe.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
    Recipe.countDocuments(filter),
  ]);

  return { recipes, pagination: buildPagination(page, perPage, total) };
}

async function discoverRecipes({ ingredients, maxPrepTime, dietaryPreferences }) {
  const aiRecipes = await openaiService.generateRecipes(ingredients, maxPrepTime, dietaryPreferences);

  const saved = await Recipe.insertMany(
    aiRecipes.map((r) => ({ ...r, source: 'ai_generated', isPublished: true }))
  );

  return saved;
}

async function getPersonalizedRecipes({ userId, page = 1, perPage = 20, isTrending }) {
  const skip = (page - 1) * perPage;
  const prefs = await UserPreference.findOne({ user: userId }).lean();
  const filter = { isPublished: true };

  if (isTrending === 'true' || isTrending === true) filter.isTrending = true;

  if (prefs?.dietaryPreferences?.length) filter.dietaryTags = { $in: prefs.dietaryPreferences };
  if (prefs?.allergens?.length) filter.allergens = { $nin: prefs.allergens };

  const [recipes, total] = await Promise.all([
    Recipe.find(filter).sort({ isTrending: -1, createdAt: -1 }).skip(skip).limit(perPage).lean(),
    Recipe.countDocuments(filter),
  ]);

  return { recipes, pagination: buildPagination(page, perPage, total) };
}

module.exports = { getRecipes, discoverRecipes, getPersonalizedRecipes };
