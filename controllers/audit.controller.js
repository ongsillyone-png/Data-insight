const AuditModel = require('../models/audit.model');

class AuditController {
    static async getLogs(req, res) {
        try {
            const logs = await AuditModel.getQueryHistory(200);
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
}

module.exports = AuditController;
