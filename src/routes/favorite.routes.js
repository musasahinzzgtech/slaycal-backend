const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/favorite.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const addSchema = z.object({ recipeId: z.string() });

router.get('/', auth, controller.getFavorites);
router.post('/', auth, validate(addSchema), controller.addFavorite);
router.delete('/:recipeId', auth, controller.removeFavorite);

module.exports = router;
