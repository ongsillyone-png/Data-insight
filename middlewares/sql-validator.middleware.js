module.exports = {
    validateSql: (req, res, next) => {
        const { sql_query } = req.body;
        
        if (!sql_query || typeof sql_query !== 'string') {
            return res.status(400).json({ error: 'SQL query is required' });
        }

        const queryLower = sql_query.trim().toLowerCase();

        // 1. Must start with SELECT or WITH
        if (!queryLower.startsWith('select') && !queryLower.startsWith('with')) {
            return res.status(400).json({ error: 'Only SELECT statements are allowed' });
        }

        // 2. Block stacked queries / multi-statements (semicolons in body)
        const trimmedSql = sql_query.trim();
        const bodyWithoutEndSemicolon = trimmedSql.replace(/;\s*$/, '');
        if (bodyWithoutEndSemicolon.includes(';')) {
            return res.status(400).json({ error: 'Multiple SQL statements (;) are forbidden for security reasons' });
        }

        // 3. Prevent malicious keywords
        // We use a regex to match exact words (bounded by word boundaries \b)
        const forbiddenKeywords = ['insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'replace', 'grant', 'revoke', 'commit', 'rollback'];
        
        for (let keyword of forbiddenKeywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(queryLower)) {
                return res.status(400).json({ error: `Forbidden keyword detected: ${keyword.toUpperCase()}` });
            }
        }

        // Optional: append LIMIT if not present, to prevent huge queries
        // But we'll handle LIMIT injection in the service layer where it's safer.

        next();
    }
};
