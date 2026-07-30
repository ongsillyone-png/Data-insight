const pool = require('../config/database');

class AuditModel {
    static async pruneOldLogs(keepLimit = 10) {
        try {
            const [topRows] = await pool.execute(`SELECT id FROM query_history ORDER BY id DESC LIMIT ${parseInt(keepLimit)}`);
            if (topRows && topRows.length >= keepLimit) {
                const minId = topRows[topRows.length - 1].id;
                await pool.execute(`DELETE FROM query_history WHERE id < ?`, [minId]);
            }
        } catch (e) {
            console.error('Prune logs error:', e);
        }
    }

    static async getQueryHistory(limit = 10) {
        await this.pruneOldLogs(limit);
        const [rows] = await pool.execute(`
            SELECT q.*, u.email as user_email 
            FROM query_history q 
            LEFT JOIN users u ON q.user_id = u.id 
            ORDER BY q.id DESC 
            LIMIT ${parseInt(limit)}
        `);
        return rows;
    }
}

module.exports = AuditModel;
