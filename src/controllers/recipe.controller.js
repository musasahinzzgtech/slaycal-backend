const recipeService = require('../services/recipe.service');

function parsePagination(query) {
  return {
    page: Math.max(1, parseInt(query.page, 10) || 1),
    perPage: Math.min(100, parseInt(query.perPage, 10) || 20),
  };
}

async function getRecipes(req, res, next) {
  try {
    const { page, perPage } = parsePagination(req.query);
    const { recipes, pagination } = await recipeService.getRecipes({ page, perPage, ...req.query });
    return res.json({ data: recipes, meta: pagination });
  } catch (err) {
    return next(err);
  }
}

async function discoverRecipes(req, res, next) {
  try {
    const recipes = await recipeService.discoverRecipes(req.body);
    return res.json({ data: { recipes } });
  } catch (err) {
    return next(err);
  }
}

async function getPersonalizedRecipes(req, res, next) {
  try {
    const { page, perPage } = parsePagination(req.query);
    const { recipes, pagination } = await recipeService.getPersonalizedRecipes({
      userId: req.user.id,
      page,
      perPage,
      isTrending: req.query.isTrending,
    });
    return res.json({ data: recipes, meta: pagination });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getRecipes, discoverRecipes, getPersonalizedRecipes };
