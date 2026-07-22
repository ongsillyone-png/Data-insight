const express = require('express');
const router = express.Router();
const InstallController = require('../../controllers/install.controller');

router.get('/', InstallController.getStep1);
router.get('/step2', InstallController.getStep2);
router.get('/step3', InstallController.getStep3);

module.exports = router;
