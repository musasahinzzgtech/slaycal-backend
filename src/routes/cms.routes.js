// WARNING: These routes are NOT secured — add auth + adminAuth and lock down CORS before production.
const { Router } = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const cmsController = require('../controllers/cms.controller');
const translationController = require('../controllers/translation.controller');
const { createSurveyQuestionSchema, updateSurveyQuestionSchema } = require('../schemas/cms.schemas');

const translationSchema = z.object({
  en: z.string().optional(),
  tr: z.string().optional(),
});

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  userType: z.enum(['anonymous', 'registered']).default('registered'),
  roles: z.array(z.string()).optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  userType: z.enum(['anonymous', 'registered']).optional(),
  roles: z.array(z.string()).optional(),
});

// ── Survey Questions CRUD (admin view — includes inactive) ───────────────────
router.get('/survey-questions', cmsController.listSurveyQuestions);
router.post('/survey-questions', validate(createSurveyQuestionSchema), cmsController.createSurveyQuestion);
router.patch('/survey-questions/:id', validate(updateSurveyQuestionSchema), cmsController.updateSurveyQuestion);
router.delete('/survey-questions/:id', cmsController.deleteSurveyQuestion);

// ── Translations CRUD ──────────────────────────────────────────────────────────
router.get('/translations', translationController.listTranslations);
router.get('/translations/:key', translationController.getTranslation);
router.put('/translations/:key', validate(translationSchema), translationController.upsertTranslation);
router.delete('/translations/:key', translationController.deleteTranslation);

// ── Users CRUD ─────────────────────────────────────────────────────────────────
router.get('/users', cmsController.listUsers);
router.post('/users', validate(createUserSchema), cmsController.createUser);
router.patch('/users/:id', validate(updateUserSchema), cmsController.updateUser);
router.delete('/users/:id', cmsController.deleteUser);

module.exports = router;
