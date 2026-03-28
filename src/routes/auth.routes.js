const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/anonymous/init', controller.initAnonymous);
router.post('/register', validate(registerSchema), controller.register);
router.post('/admin/register', validate(registerSchema), controller.registerAdmin);
router.post('/login', validate(loginSchema), controller.login);
router.post('/logout', auth, controller.logout);

module.exports = router;
