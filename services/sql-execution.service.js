const hisPool = require('../config/his-database');
const pool = require('../config/database'); // System DB for audit log

class SqlExecutionService {
    static async executePreview(sql, userId, limit = null) {
        let finalSql = sql.trim();
        // Remove trailing semicolons cleanly
        finalSql = finalSql.replace(/;\s*$/, '');

        // Only append limit if explicitly passed as a positive number
        if (limit && typeof limit === 'number' && limit > 0 && !/\blimit\s+\d+/i.test(finalSql)) {
            finalSql += ` LIMIT ${limit}`;
        }

        let executionTimeMs = 0;
        let status = 'success';
        let errorMessage = null;

        try {
            const startTime = Date.now();
            const [rows, fields] = await hisPool.query(finalSql);
            executionTimeMs = Date.now() - startTime;

            // Extract columns
            const columns = fields ? fields.map(f => f.name) : [];
            // Log Success
            if (userId) {
                await pool.execute('INSERT INTO query_history (user_id, executed_sql, execution_time_ms, status) VALUES (?, ?, ?, ?)',
                    [userId, sql, executionTimeMs, status]);
            }
            
            return {
                success: true,
                columns,
                rows,
                executionTimeMs
            };
        } catch (error) {
            status = 'fail';
            errorMessage = error.message;
            // Log Error
            if (userId) {
                await pool.execute('INSERT INTO query_history (user_id, executed_sql, execution_time_ms, status, error_message) VALUES (?, ?, ?, ?, ?)',
                    [userId, sql, executionTimeMs, status, errorMessage]);
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }
}

module.exports = SqlExecutionService;
