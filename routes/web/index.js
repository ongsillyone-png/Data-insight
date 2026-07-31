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
router.get('/shared/report/:uuid/data', SharedController.getData);
router.get('/shared/report/:uuid/export', SharedController.exportCSV);
router.post('/shared/report/:uuid/auth', SharedController.authenticate);
router.get('/shared/report/:uuid', SharedController.getView);

const ReportModel = require('../../models/report.model');
const DashboardModel = require('../../models/dashboard.model');
const AuditModel = require('../../models/audit.model');
const hisPool = require('../../config/his-database');

// Protected Routes
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user ? req.session.user.id : null;
        const role = req.session.user ? req.session.user.role : 'user';

        // 1. Fetch Reports & Dashboards
        const reports = await ReportModel.findAll(userId, role);
        const dashboards = await DashboardModel.findAll();

        // 2. Fetch recent Audit Logs (for admin/analyst)
        let recentLogs = [];
        if (role === 'admin' || role === 'analyst') {
            try {
                recentLogs = await AuditModel.getQueryHistory(5);
            } catch (e) {
                console.error('Error fetching audit logs for home:', e.message);
            }
        }

        // 3. Test HIS DB Connection
        let hisConnected = false;
        try {
            await hisPool.query('SELECT 1');
            hisConnected = true;
        } catch (e) {
            console.warn('HIS database check failed:', e.message);
            hisConnected = false;
        }

        res.render('pages/index', { 
            title: 'Home | Data Insight System',
            user: req.session.user,
            stats: {
                totalReports: reports.length,
                totalDashboards: dashboards.length,
                totalLogs: recentLogs.length,
                hisConnected: hisConnected
            },
            recentReports: reports.slice(0, 5),
            recentDashboards: dashboards.slice(0, 5),
            recentLogs: recentLogs
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.render('pages/index', { 
            title: 'Home | Data Insight System',
            user: req.session.user,
            stats: {
                totalReports: 0,
                totalDashboards: 0,
                totalLogs: 0,
                hisConnected: false
            },
            recentReports: [],
            recentDashboards: [],
            recentLogs: []
        });
    }
});

// Reports Web Routes
router.get('/reports', isAuthenticated, ReportController.getIndex);
router.get('/reports/new', isAuthenticated, hasRole(['admin', 'analyst']), ReportController.getNewReport);
router.get('/reports/:id/view', isAuthenticated, ReportController.getView);
router.get('/reports/:id/export', isAuthenticated, ReportController.exportCSV);

// Dashboards Web Routes
router.get('/dashboards', isAuthenticated, DashboardController.getIndex);
router.get('/dashboards/new', isAuthenticated, hasRole(['admin', 'analyst']), DashboardController.getBuilder);
router.get('/dashboards/:id/edit', isAuthenticated, hasRole(['admin', 'analyst']), DashboardController.getBuilderForEdit);

// Admin Routes
router.get('/audit', isAuthenticated, hasRole(['admin']), AuditController.getLogs);

module.exports = router;
