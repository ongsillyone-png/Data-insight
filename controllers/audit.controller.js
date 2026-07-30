const AuditModel = require('../models/audit.model');

class AuditController {
    static async getLogs(req, res) {
        try {
            const logs = await AuditModel.getQueryHistory(10);
            res.render('pages/audit/index', { 
                title: 'Audit Logs | Dynamic Report Builder',
                user: req.session.user,
                logs 
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    }

    static async clearLogs(req, res) {
        try {
            await AuditModel.pruneOldLogs(10);
            res.redirect('/audit');
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    }
}

module.exports = AuditController;
