const Favorite = require('../models/Favorite');
const Recipe = require('../models/Recipe');
const ApiError = require('../utils/ApiError');

function buildPagination(page, perPage, total) {
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const from = (page - 1) * perPage;
  const to = Math.min(from + perPage, total);
  return { page, perPage, total, lastPage, from, to };
}

function mapRecipe(r) {
  if (!r) return null;
  return {
    id: r._id.toString(),
    title: r.title,
    description: r.description,
    ingredients: r.ingredients || [],
    instructions: r.instructions || [],
    prepTimeMinutes: r.prepTimeMinutes,
    cookTimeMinutes: r.cookTimeMinutes,
    totalTimeMinutes: (r.prepTimeMinutes || 0) + (r.cookTimeMinutes || 0),
    servings: r.servings,
    imageUrl: r.imageUrl || null,
    nutrition: r.nutrition || null,
    dietaryTags: r.dietaryTags || [],
    allergens: r.allergens || [],
    cuisineType: r.cuisineType,
    difficulty: r.difficulty,
    source: r.source,
    isPublished: r.isPublished,
    isFavorite: true,
    isTrending: r.isTrending,
    category: r.category,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
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

  const recipes = favs.map((f) => mapRecipe(f.recipe)).filter(Boolean);
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
