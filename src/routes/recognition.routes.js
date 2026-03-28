const express = require('express');
const controller = require('../controllers/recognition.controller');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/upload', auth, upload.single('image'), controller.uploadImage);
router.get('/jobs/:jobId', auth, controller.getJob);

module.exports = router;
