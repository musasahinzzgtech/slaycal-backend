const favoriteService = require('../services/favorite.service');

async function getFavorites(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(100, parseInt(req.query.perPage, 10) || 20);
    const result = await favoriteService.getFavorites({ userId: req.user.id, page, perPage });
    return res.json({ data: result });
  } catch (err) {
    return next(err);
  }
}

async function addFavorite(req, res, next) {
  try {
    const favorite = await favoriteService.addFavorite({
      userId: req.user.id,
      recipeId: req.body.recipeId,
    });
    return res.status(201).json({ data: { favorite } });
  } catch (err) {
    return next(err);
  }
}

async function removeFavorite(req, res, next) {
  try {
    await favoriteService.removeFavorite({ userId: req.user.id, recipeId: req.params.recipeId });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { getFavorites, addFavorite, removeFavorite };
