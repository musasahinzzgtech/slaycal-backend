const Favorite = require('../models/Favorite');
const Recipe = require('../models/Recipe');
const ApiError = require('../utils/ApiError');

function buildPagination(page, perPage, total) {
  return { page, perPage, total, totalPages: Math.ceil(total / perPage) };
}

async function getFavorites({ userId, page = 1, perPage = 20 }) {
  const skip = (page - 1) * perPage;

  const [favs, total] = await Promise.all([
    Favorite.find({ user: userId })
      .populate('recipe')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
    Favorite.countDocuments({ user: userId }),
  ]);

  const recipes = favs.map((f) => f.recipe).filter(Boolean);
  return { recipes, pagination: buildPagination(page, perPage, total) };
}

async function addFavorite({ userId, recipeId }) {
  const recipe = await Recipe.findById(recipeId).lean();
  if (!recipe) throw new ApiError(404, 'Recipe not found', 'NOT_FOUND');

  return Favorite.findOneAndUpdate(
    { user: userId, recipe: recipeId },
    { user: userId, recipe: recipeId },
    { upsert: true, new: true }
  ).lean();
}

async function removeFavorite({ userId, recipeId }) {
  await Favorite.deleteOne({ user: userId, recipe: recipeId });
}

module.exports = { getFavorites, addFavorite, removeFavorite };
