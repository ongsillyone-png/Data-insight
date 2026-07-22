const pool = require('../config/database');

class AuditModel {
    static async getQueryHistory(limit = 100) {
        const [rows] = await pool.execute(`
            SELECT q.*, u.email as user_email 
            FROM query_history q 
            LEFT JOIN users u ON q.user_id = u.id 
            ORDER BY q.created_at DESC 
            LIMIT ?
        `, [limit]);
        return rows;
    }
}

module.exports = AuditModel;
