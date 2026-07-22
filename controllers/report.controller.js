const SqlExecutionService = require('../services/sql-execution.service');
const ChartRecommendationService = require('../services/chart-recommendation.service');
const ReportModel = require('../models/report.model');

class ReportController {
    // --- Web Views ---
    static async getIndex(req, res) {
        try {
            const reports = await ReportModel.findAll();
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
            const { name, description, sql_query, chart_type, chart_config } = req.body;
            const reportId = await ReportModel.create({
                name,
                description,
                sql_query,
                chart_type,
                chart_config,
                created_by: req.session.user.id
            });
            res.json({ success: true, id: reportId });
        } catch (error) {
            console.error('Save report error:', error);
            res.status(500).json({ error: 'Failed to save report' });
        }
    }

    static async getReportData(req, res) {
        try {
            const report = await ReportModel.findById(req.params.id);
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
            const report = await ReportModel.findById(req.params.id);
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
}

module.exports = ReportController;
