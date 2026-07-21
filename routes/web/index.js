const express = require('express');
const router = express.Router();
const AuthController = require('../../controllers/auth.controller');
const ReportController = require('../../controllers/report.controller');
const { isAuthenticated, isGuest } = require('../../middlewares/auth.middleware');

// Auth Routes
router.get('/login', isGuest, AuthController.getLogin);
router.post('/login', isGuest, AuthController.postLogin);
router.get('/logout', isAuthenticated, AuthController.logout);

// Protected Routes
router.get('/', isAuthenticated, (req, res) => {
    res.render('pages/index', { 
        title: 'Dashboard | Dynamic Report Builder',
        user: req.session.user
    });
});

// Reports Web Routes
router.get('/reports', isAuthenticated, ReportController.getIndex);
router.get('/reports/new', isAuthenticated, ReportController.getNewReport);

module.exports = router;
