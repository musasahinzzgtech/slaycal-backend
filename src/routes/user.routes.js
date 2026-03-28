const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/user.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const updateSchema = z.object({
  currentWeight: z.number().optional(),
  goalWeight: z.number().optional(),
  height: z.number().optional(),
  gender: z.string().optional(),
  age: z.number().optional(),
  activityLevel: z.string().optional(),
  goalType: z.string().optional(),
});

router.get('/personal-details', auth, controller.getPersonalDetails);
router.patch('/personal-details', auth, validate(updateSchema), controller.updatePersonalDetails);

module.exports = router;
