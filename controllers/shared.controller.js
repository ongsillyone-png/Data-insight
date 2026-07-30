const ReportModel = require('../models/report.model');
const SqlExecutionService = require('../services/sql-execution.service');
const SqlParamService = require('../services/sql-param.service');
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
            let userParams = {};
            if (req.query && req.query.params) {
                try { userParams = typeof req.query.params === 'string' ? JSON.parse(req.query.params) : req.query.params; } catch (e) {}
            } else if (req.body && req.body.params) {
                userParams = req.body.params;
            }

            const unlocked = req.session.unlocked_reports || [];
            if (!unlocked.includes(uuid)) {
                return res.status(403).json({ error: 'Unauthorized. Password required.' });
            }

            const report = await ReportModel.findByUuid(uuid);
            if (!report || !report.is_shareable) {
                return res.status(404).json({ error: 'Report not found' });
            }

            const processedSql = SqlParamService.processSql(report.sql_query, userParams);
            const result = await SqlExecutionService.executePreview(processedSql, null);
            
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            const detectedParams = SqlParamService.parseParameters(report.sql_query);

            res.json({
                report_id: report.id,
                name: report.name,
                chart_type: report.chart_type,
                chart_config: report.chart_config,
                visual_config: report.visual_config,
                columns: result.columns,
                rows: result.rows,
                detectedParams
            });

        } catch (error) {
            console.error('Shared getData error:', error);
            res.status(500).json({ error: 'Failed to fetch shared report data' });
        }
    }

    static async exportCSV(req, res) {
        try {
            const { uuid } = req.params;
            const report = await ReportModel.findByUuid(uuid);
            if (!report || !report.is_shareable) {
                return res.status(404).send('Report not found');
            }

            if (report.share_password_hash) {
                const unlocked = req.session.unlocked_reports || [];
                if (!unlocked.includes(uuid)) {
                    return res.status(403).send('Unauthorized. Password required.');
                }
            }

            let userParams = {};
            if (req.query && req.query.params) {
                try { userParams = JSON.parse(req.query.params); } catch (e) {}
            }

            const processedSql = SqlParamService.processSql(report.sql_query, userParams);
            const result = await SqlExecutionService.executePreview(processedSql, null);
            if (!result.success) {
                return res.status(400).send('Query error: ' + result.error);
            }

            const { columns, rows } = result;
            
            // UTF-8 BOM for Thai Excel compatibility
            let csv = '\uFEFF';
            csv += columns.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\r\n';
            rows.forEach(row => {
                csv += columns.map(c => {
                    const val = row[c] ?? '';
                    return `"${String(val).replace(/"/g, '""')}"`;
                }).join(',') + '\r\n';
            });

            const filename = encodeURIComponent(report.name || 'report') + '_raw_data.csv';
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);
            res.send(csv);

        } catch (error) {
            console.error('Shared export error:', error);
            res.status(500).send('Export failed');
        }
    }
}

module.exports = SharedController;
