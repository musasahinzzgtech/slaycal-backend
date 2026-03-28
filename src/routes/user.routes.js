const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/user.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const updateSchema = z.object({
  currentWeight: z.number().min(1).max(700).optional(),
  goalWeight: z.number().min(1).max(700).optional(),
  height: z.number().min(50).max(300).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  age: z.number().int().min(1).max(120).optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  goalType: z.enum(['lose_weight', 'maintain', 'gain_muscle']).optional(),
});

router.get('/personal-details', auth, controller.getPersonalDetails);
router.patch('/personal-details', auth, validate(updateSchema), controller.updatePersonalDetails);

module.exports = router;
