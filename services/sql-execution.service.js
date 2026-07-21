const hisPool = require('../config/his-database');

class SqlExecutionService {
    static async executePreview(sql, limit = 1000) {
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

        try {
            const startTime = Date.now();
            const [rows, fields] = await hisPool.query(finalSql);
            const executionTimeMs = Date.now() - startTime;

            // Extract columns
            const columns = fields ? fields.map(f => f.name) : [];
            
            return {
                success: true,
                columns,
                rows,
                executionTimeMs
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = SqlExecutionService;
