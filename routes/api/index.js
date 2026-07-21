const express = require('express');
const router = express.Router();
const ReportController = require('../../controllers/report.controller');
const { validateSql } = require('../../middlewares/sql-validator.middleware');
const { isAuthenticated } = require('../../middlewares/auth.middleware');

// API routes are protected by authentication
router.use(isAuthenticated);

// Report APIs
router.post('/reports/run', validateSql, ReportController.runQuery);
router.post('/reports', validateSql, ReportController.saveReport);

module.exports = router;
