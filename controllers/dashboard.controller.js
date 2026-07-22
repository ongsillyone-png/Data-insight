const DashboardModel = require('../models/dashboard.model');
const ReportModel = require('../models/report.model');

class DashboardController {
    // --- Web Views ---
    static async getIndex(req, res) {
        try {
            const dashboards = await DashboardModel.findAll();
            res.render('pages/dashboards/index', { 
                title: 'Dashboards | Dynamic Report Builder',
                user: req.session.user,
                dashboards 
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    }

    static async getBuilder(req, res) {
        try {
            const reports = await ReportModel.findAll();
            res.render('pages/dashboards/builder', { 
                title: 'Dashboard Builder | Dynamic Report Builder',
                user: req.session.user,
                reports,
                dashboard: null
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    }

    static async getBuilderForEdit(req, res) {
        try {
            const dashboard = await DashboardModel.findById(req.params.id);
            if (!dashboard) return res.status(404).send('Not Found');
            
            const reports = await ReportModel.findAll();
            res.render('pages/dashboards/builder', { 
                title: 'Edit Dashboard | Dynamic Report Builder',
                user: req.session.user,
                reports,
                dashboard
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    }

    // --- APIs ---
    static async saveDashboard(req, res) {
        try {
            const { name, layout_config } = req.body;
            const dashboardId = await DashboardModel.create({
                name,
                layout_config,
                created_by: req.session.user.id
            });
            res.json({ success: true, id: dashboardId });
        } catch (error) {
            console.error('Save dashboard error:', error);
            res.status(500).json({ error: 'Failed to save dashboard' });
        }
    }

    static async updateDashboard(req, res) {
        try {
            const { name, layout_config } = req.body;
            await DashboardModel.update(req.params.id, {
                name,
                layout_config
            });
            res.json({ success: true });
        } catch (error) {
            console.error('Update dashboard error:', error);
            res.status(500).json({ error: 'Failed to update dashboard' });
        }
    }
}

module.exports = DashboardController;
