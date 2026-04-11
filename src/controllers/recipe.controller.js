const recipeService = require("../services/recipe.service");

function parsePagination(query) {
  return {
    page: Math.max(1, parseInt(query.page, 10) || 1),
    perPage: Math.min(100, parseInt(query.perPage, 10) || 20),
  };
}

async function getRecipes(req, res, next) {
  try {
    const { page, perPage } = parsePagination(req.query);
    const { recipes, pagination } = await recipeService.getRecipes({
      page,
      perPage,
      ...req.query,
    });
    return res.json({ data: recipes, meta: pagination });
  } catch (err) {
    return next(err);
  }
}

async function discoverRecipes(req, res, next) {
  try {
    const language =
      req.get("Accept-Language")?.split(",")[0]?.split("-")[0]?.trim() || "en";
    const { requestId } = await recipeService.startDiscoverRecipes({
      ...req.body,
      language,
      userId: req.user.id,
    });
    return res.status(202).json({ data: { requestId } });
  } catch (err) {
    return next(err);
  }
}

async function getRecipesAI(req, res, next) {
  try {
    const { page, perPage } = parsePagination(req.query);
    const { recipes, pagination } = await recipeService.getRecipesAI({
      userId: req.user.id,
      page,
      perPage,
    });
    return res.json({ data: recipes, meta: pagination });
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

module.exports = {
  getRecipes,
  discoverRecipes,
  getPersonalizedRecipes,
  getRecipesAI,
};
