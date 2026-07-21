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
        const result = await SqlExecutionService.executePreview(sql_query);
        
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
}

module.exports = ReportController;
