const express = require("express");
const controller = require("../controllers/user.controller");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/fcm-token", auth, controller.registerFcmToken);

module.exports = router;
