const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/nutrition.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const foodLogSchema = z.object({
  mealName: z.string().min(1).max(200),
  calories: z.number().min(0).max(10000),
  proteinGrams: z.number().min(0).max(1000).default(0),
  carbsGrams: z.number().min(0).max(1000).default(0),
  fatGrams: z.number().min(0).max(1000).default(0),
  quantity: z.number().min(0.1).max(100).default(1),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('snack'),
  loggedAt: z.string().optional(),
});

const foodLogUpdateSchema = z.object({
  mealName: z.string().min(1).max(200).optional(),
  calories: z.number().min(0).max(10000).optional(),
  proteinGrams: z.number().min(0).max(1000).optional(),
  carbsGrams: z.number().min(0).max(1000).optional(),
  fatGrams: z.number().min(0).max(1000).optional(),
  quantity: z.number().min(0.1).max(100).optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
});

const waterSchema = z.object({
  amountMl: z.number().positive(),
  loggedAt: z.string().optional(),
});

const weightLogSchema = z.object({
  weightKg: z.number().positive(),
  note: z.string().optional(),
  loggedAt: z.string().optional(),
});

const goalPlanSchema = z.object({
  targetWeightKg: z.number().optional(),
  targetCalories: z.number().optional(),
  targetProteinG: z.number().optional(),
  targetCarbsG: z.number().optional(),
  targetFatG: z.number().optional(),
  targetWaterMl: z.number().optional(),
});

// Food log
router.get('/food-log', auth, controller.getFoodLog);
router.post('/food-log', auth, validate(foodLogSchema), controller.createFoodLog);
router.patch('/food-log/:id', auth, validate(foodLogUpdateSchema), controller.updateFoodLog);
router.delete('/food-log/:id', auth, controller.deleteFoodLog);

// Water intake
router.get('/water-intake', auth, controller.getWaterIntake);
router.post('/water-intake', auth, validate(waterSchema), controller.createWaterIntake);
router.delete('/water-intake/:id', auth, controller.deleteWaterIntake);

// Progress
router.get('/progress', auth, controller.getProgress);

// Weight log
router.post('/weight-log', auth, validate(weightLogSchema), controller.createWeightLog);

// Goal plans — specific before generic
router.get('/goal-plans/active', auth, controller.getActiveGoalPlan);
router.post('/goal-plans', auth, validate(goalPlanSchema), controller.createGoalPlan);

module.exports = router;
