const express = require('express');
const router = express.Router();
const AuthController = require('../../controllers/auth.controller');
const ReportController = require('../../controllers/report.controller');
const DashboardController = require('../../controllers/dashboard.controller');
const AuditController = require('../../controllers/audit.controller');
const SharedController = require('../../controllers/shared.controller');
const { isAuthenticated, isGuest, hasRole } = require('../../middlewares/auth.middleware');

// Auth Routes
router.get('/login', isGuest, AuthController.getLogin);
router.post('/login', isGuest, AuthController.postLogin);
router.get('/logout', isAuthenticated, AuthController.logout);

// Shared Routes (Public)
router.get('/shared/report/:uuid', SharedController.getView);
router.post('/shared/report/:uuid/auth', SharedController.authenticate);
router.get('/shared/report/:uuid/data', SharedController.getData);

// Protected Routes
router.get('/', isAuthenticated, (req, res) => {
    res.render('pages/index', { 
        title: 'Dashboard | Dynamic Report Builder',
        user: req.session.user
    });
});

// Reports Web Routes
router.get('/reports', isAuthenticated, ReportController.getIndex);
router.get('/reports/new', isAuthenticated, hasRole(['admin', 'analyst']), ReportController.getNewReport);
router.get('/reports/:id/export', isAuthenticated, ReportController.exportCSV);

// Dashboards Web Routes
router.get('/dashboards', isAuthenticated, DashboardController.getIndex);
router.get('/dashboards/new', isAuthenticated, hasRole(['admin', 'analyst']), DashboardController.getBuilder);
router.get('/dashboards/:id/edit', isAuthenticated, hasRole(['admin', 'analyst']), DashboardController.getBuilderForEdit);

// Admin Routes
router.get('/audit', isAuthenticated, hasRole(['admin']), AuditController.getLogs);

module.exports = router;
