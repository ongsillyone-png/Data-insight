const hisPool = require('../config/his-database');
const pool = require('../config/database'); // System DB for audit log

class SqlExecutionService {
    static async executePreview(sql, userId, limit = 1000) {
        // Simple trick: wrap user query in a subquery to enforce limit safely
        // Wait, MySQL 8 supports CTE or subquery. Let's just append LIMIT if not exists, 
        // or execute directly. To be safe, let's just execute and if it's too big, it might cause issues,
        // but for a preview, we can append limit if we don't find it.
        
        let finalSql = sql.trim();
        // Remove trailing semicolon
        if (finalSql.endsWith(';')) {
            finalSql = finalSql.slice(0, -1);
        }

        // Add limit for safety if not explicitly stated
        if (!finalSql.toLowerCase().includes('limit')) {
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
