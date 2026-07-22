const express = require('express');
const router = express.Router();
const ReportController = require('../../controllers/report.controller');
const DashboardController = require('../../controllers/dashboard.controller');
const { validateSql } = require('../../middlewares/sql-validator.middleware');
const { isAuthenticated, hasRole } = require('../../middlewares/auth.middleware');

// API routes are protected by authentication
router.use(isAuthenticated);

// Report APIs
router.post('/reports/run', validateSql, hasRole(['admin', 'analyst']), ReportController.runQuery);
router.post('/reports', validateSql, hasRole(['admin', 'analyst']), ReportController.saveReport);
router.get('/reports/:id/data', ReportController.getReportData);

// Dashboard APIs
router.post('/dashboards', hasRole(['admin', 'analyst']), DashboardController.saveDashboard);
router.put('/dashboards/:id', hasRole(['admin', 'analyst']), DashboardController.updateDashboard);

module.exports = router;
