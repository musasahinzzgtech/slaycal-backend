const { Router } = require('express');
const controller = require('../controllers/translation.controller');

const router = Router();

// Public — no auth required; locale resolved from Accept-Language header
router.get('/', controller.getLocaleTranslations);

module.exports = router;
