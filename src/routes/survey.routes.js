const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/survey.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const submitSchema = z.object({
  responses: z.array(
    z.object({
      questionKey: z.string(),
      answers: z.array(z.string()),
    })
  ),
});

router.get('/questions', auth, controller.getQuestions);
router.post('/submit', auth, validate(submitSchema), controller.submitSurvey);
router.get('/preferences', auth, controller.getPreferences);

module.exports = router;
