const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/recipe.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const discoverSchema = z.object({
  ingredients: z.array(z.string()).min(1),
  maxPrepTime: z.number().optional(),
  dietaryPreferences: z.array(z.string()).optional(),
});

router.get('/ai', auth, controller.getRecipesAI);
router.get('/', controller.getRecipes);
router.post('/discover', auth, validate(discoverSchema), controller.discoverRecipes);
router.get('/personalized', auth, controller.getPersonalizedRecipes);

module.exports = router;
