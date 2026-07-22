const ReportModel = require('../models/report.model');
const SqlExecutionService = require('../services/sql-execution.service');
const bcrypt = require('bcryptjs');

class SharedController {
    static async getView(req, res) {
        try {
            const { uuid } = req.params;
            const report = await ReportModel.findByUuid(uuid);
            
            if (!report || !report.is_shareable) {
                return res.status(404).send('Shared link not found or has been disabled.');
            }

            // Check if user has already unlocked this report in their session
            const unlocked = req.session.unlocked_reports || [];
            if (!unlocked.includes(uuid)) {
                return res.render('pages/shared/auth', { 
                    title: 'Password Required | Dynamic Report Builder',
                    uuid,
                    error: null
                });
            }

            // Allowed to view
            res.render('pages/shared/view', {
                title: `${report.name} | Shared Report`,
                report
            });

        } catch (error) {
            console.error('Shared view error:', error);
            res.status(500).send('Internal Server Error');
        }
    }

    static async authenticate(req, res) {
        try {
            const { uuid } = req.params;
            const { password } = req.body;
            
            const report = await ReportModel.findByUuid(uuid);
            if (!report || !report.is_shareable) {
                return res.status(404).send('Shared link not found or has been disabled.');
            }

            const isValid = await bcrypt.compare(password, report.share_password_hash);
            if (isValid) {
                if (!req.session.unlocked_reports) {
                    req.session.unlocked_reports = [];
                }
                if (!req.session.unlocked_reports.includes(uuid)) {
                    req.session.unlocked_reports.push(uuid);
                }
                return res.redirect(`/shared/report/${uuid}`);
            }

            // Invalid password
            return res.render('pages/shared/auth', { 
                title: 'Password Required | Dynamic Report Builder',
                uuid,
                error: 'Incorrect password. Please try again.'
            });
        } catch (error) {
            console.error('Auth error:', error);
            res.status(500).send('Internal Server Error');
        }
    }

    static async getData(req, res) {
        try {
            const { uuid } = req.params;
            const unlocked = req.session.unlocked_reports || [];
            if (!unlocked.includes(uuid)) {
                return res.status(403).json({ error: 'Unauthorized. Password required.' });
            }

            const report = await ReportModel.findByUuid(uuid);
            if (!report || !report.is_shareable) {
                return res.status(404).json({ error: 'Report not found' });
            }

            // Pass null for userId so it doesn't log in query_history, or log it as 'shared_viewer'
            // For now let's just pass null. The service checks `if (userId)` before logging.
            const result = await SqlExecutionService.executePreview(report.sql_query, null);
            
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json({
                report_id: report.id,
                name: report.name,
                chart_type: report.chart_type,
                chart_config: report.chart_config,
                columns: result.columns,
                rows: result.rows
            });

        } catch (error) {
            console.error('Shared get data error:', error);
            res.status(500).json({ error: 'Failed to fetch data' });
        }
    }
}

module.exports = SharedController;
