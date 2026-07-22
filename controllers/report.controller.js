const SqlExecutionService = require('../services/sql-execution.service');
const ChartRecommendationService = require('../services/chart-recommendation.service');
const ReportModel = require('../models/report.model');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class ReportController {
    // --- Web Views ---
    static async getIndex(req, res) {
        try {
            const reports = await ReportModel.findAll(req.session.user.id, req.session.user.role);
            res.render('pages/reports/index', { 
                title: 'Saved Reports | Dynamic Report Builder',
                user: req.session.user,
                reports 
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    }

    static getNewReport(req, res) {
        res.render('pages/reports/new', { 
            title: 'New Report | Dynamic Report Builder',
            user: req.session.user
        });
    }

    // --- APIs ---
    static async runQuery(req, res) {
        const { sql_query } = req.body;
        
        // Execute SQL via service
        const result = await SqlExecutionService.executePreview(sql_query, req.session.user.id);
        
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        // Recommend Chart
        const recommendedChart = ChartRecommendationService.recommendChart(result.columns, result.rows);

        res.json({
            columns: result.columns,
            rows: result.rows,
            executionTimeMs: result.executionTimeMs,
            recommendedChart
        });
    }

    static async saveReport(req, res) {
        try {
            const { name, description, sql_query, chart_type, chart_config, is_public } = req.body;
            const reportId = await ReportModel.create({
                name,
                description,
                sql_query,
                chart_type,
                chart_config,
                created_by: req.session.user.id,
                is_public
            });
            res.json({ success: true, id: reportId });
        } catch (error) {
            console.error('Save report error:', error);
            res.status(500).json({ error: 'Failed to save report' });
        }
    }

    static async getReportData(req, res) {
        try {
            const { id } = req.params;
            const hasPerm = await ReportModel.hasPermission(id, req.session.user.id, req.session.user.role, 'view');
            if (!hasPerm) return res.status(403).json({ error: 'Forbidden' });

            const report = await ReportModel.findById(id);
            if (!report) return res.status(404).json({ error: 'Report not found' });
            
            const result = await SqlExecutionService.executePreview(report.sql_query, req.session.user.id);
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
            console.error('Get report data error:', error);
            res.status(500).json({ error: 'Failed to fetch report data' });
        }
    }

    static async exportCSV(req, res) {
        try {
            const { id } = req.params;
            const hasPerm = await ReportModel.hasPermission(id, req.session.user.id, req.session.user.role, 'view');
            if (!hasPerm) return res.status(403).json({ error: 'Forbidden' });

            const report = await ReportModel.findById(id);
            if (!report) return res.status(404).json({ error: 'Report not found' });
            
            const result = await SqlExecutionService.executePreview(report.sql_query, req.session.user.id, 10000); // 10k limit for export
            if (!result.success) {
                return res.status(400).send('Error generating export: ' + result.error);
            }

            // Generate CSV string
            const columns = result.columns;
            const rows = result.rows;
            
            let csv = columns.join(',') + '\n';
            rows.forEach(row => {
                csv += columns.map(col => {
                    let cell = row[col] === null || row[col] === undefined ? '' : String(row[col]);
                    // Escape double quotes and wrap in quotes if contains comma
                    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                        cell = '"' + cell.replace(/"/g, '""') + '"';
                    }
                    return cell;
                }).join(',') + '\n';
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="report_${report.id}_${Date.now()}.csv"`);
            res.send(csv);
        } catch (error) {
            console.error('Export error:', error);
            res.status(500).send('Failed to export data');
        }
    }

    // --- Sharing APIs ---
    static async getPermissions(req, res) {
        try {
            const { id } = req.params;
            // Only owner or admin can manage permissions
            const report = await ReportModel.findById(id);
            if (!report) return res.status(404).json({ error: 'Report not found' });
            
            if (report.created_by !== req.session.user.id && req.session.user.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden: You cannot manage permissions for this report' });
            }

            const perms = await ReportModel.getPermissions(id);
            res.json({ permissions: perms, is_public: report.is_public });
        } catch (error) {
            console.error('Get permissions error:', error);
            res.status(500).json({ error: 'Failed to fetch permissions' });
        }
    }

    static async updatePermissions(req, res) {
        try {
            const { id } = req.params;
            const { is_public, shares } = req.body; // shares: [{user_id, permission_level}]

            const report = await ReportModel.findById(id);
            if (!report) return res.status(404).json({ error: 'Report not found' });
            
            if (report.created_by !== req.session.user.id && req.session.user.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden' });
            }

            // Update is_public flag
            await ReportModel.update(id, { ...report, is_public });

            // Clear old permissions and insert new ones
            const existing = await ReportModel.getPermissions(id);
            
            for (let ext of existing) {
                const stillExists = shares.find(s => parseInt(s.user_id) === parseInt(ext.user_id));
                if (!stillExists) {
                    await ReportModel.removePermission(id, ext.user_id);
                }
            }

            for (let share of shares) {
                await ReportModel.addPermission(id, share.user_id, share.permission_level);
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Update permissions error:', error);
            res.status(500).json({ error: 'Failed to update permissions' });
        }
    }

    static async updateLinkShare(req, res) {
        try {
            const { id } = req.params;
            const { is_shareable, password } = req.body;

            const report = await ReportModel.findById(id);
            if (!report) return res.status(404).json({ error: 'Report not found' });
            
            if (report.created_by !== req.session.user.id && req.session.user.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden' });
            }

            if (!is_shareable) {
                await ReportModel.updateSharing(id, false, report.share_password_hash, report.share_uuid);
                return res.json({ success: true, is_shareable: false });
            }

            // Enable sharing
            let share_uuid = report.share_uuid;
            if (!share_uuid) {
                share_uuid = crypto.randomUUID();
            }

            let share_password_hash = report.share_password_hash;
            if (password) { // Only update hash if a new password is provided
                share_password_hash = await bcrypt.hash(password, 10);
            }

            if (is_shareable && !share_password_hash) {
                return res.status(400).json({ error: 'Password is required to enable link sharing for the first time.' });
            }

            await ReportModel.updateSharing(id, true, share_password_hash, share_uuid);
            
            // Return link
            const link = `${req.protocol}://${req.get('host')}/shared/report/${share_uuid}`;
            res.json({ success: true, is_shareable: true, link });
        } catch (error) {
            console.error('Update link share error:', error);
            res.status(500).json({ error: 'Failed to update link sharing' });
        }
    }
}

module.exports = ReportController;
