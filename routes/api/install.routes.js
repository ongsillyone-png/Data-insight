const express = require('express');
const router = express.Router();
const InstallController = require('../../controllers/install.controller');

router.post('/step1', InstallController.postStep1);
router.post('/step2', InstallController.postStep2);
router.post('/step3', InstallController.postStep3);

module.exports = router;
