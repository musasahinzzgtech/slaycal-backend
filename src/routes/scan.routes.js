const express = require('express');
const controller = require('../controllers/scan.controller');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/upload', auth, upload.single('image'), controller.uploadScan);

module.exports = router;
