const pool = require('../config/database');

class ReportModel {
    static async findAll(userId, role) {
        let query = `
            SELECT r.*, u.email as creator_email 
            FROM reports r 
            LEFT JOIN users u ON r.created_by = u.id 
        `;
        let params = [];

        if (role !== 'admin') {
            query += `
                LEFT JOIN report_permissions rp ON r.id = rp.report_id AND rp.user_id = ?
                WHERE r.is_public = TRUE 
                OR r.created_by = ? 
                OR rp.id IS NOT NULL
            `;
            params = [userId, userId];
        }

        query += ' ORDER BY r.created_at DESC';
        const [rows] = await pool.execute(query, params);
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.execute('SELECT * FROM reports WHERE id = ?', [id]);
        return rows[0];
    }

    static async findByUuid(uuid) {
        const [rows] = await pool.execute('SELECT * FROM reports WHERE share_uuid = ?', [uuid]);
        return rows[0];
    }

    static async create(data) {
        const { name, description, sql_query, chart_type, chart_config, created_by, is_public } = data;
        const [result] = await pool.execute(
            'INSERT INTO reports (name, description, sql_query, chart_type, chart_config, created_by, is_public) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, description || '', sql_query, chart_type || 'table', JSON.stringify(chart_config || {}), created_by, is_public ? 1 : 0]
        );
        return result.insertId;
    }

    static async update(id, data) {
        const { name, description, sql_query, chart_type, chart_config, is_public } = data;
        await pool.execute(
            'UPDATE reports SET name=?, description=?, sql_query=?, chart_type=?, chart_config=?, is_public=? WHERE id=?',
            [name, description, sql_query, chart_type, JSON.stringify(chart_config), is_public ? 1 : 0, id]
        );
    }

    static async delete(id) {
        await pool.execute('DELETE FROM reports WHERE id = ?', [id]);
    }

    // --- Sharing Methods ---
    
    static async updateSharing(id, is_shareable, share_password_hash, share_uuid) {
        if (share_uuid) {
            await pool.execute(
                'UPDATE reports SET is_shareable=?, share_password_hash=?, share_uuid=? WHERE id=?',
                [is_shareable ? 1 : 0, share_password_hash, share_uuid, id]
            );
        } else {
            await pool.execute(
                'UPDATE reports SET is_shareable=? WHERE id=?',
                [is_shareable ? 1 : 0, id]
            );
        }
    }

    static async getPermissions(reportId) {
        const [rows] = await pool.execute(`
            SELECT rp.*, u.email 
            FROM report_permissions rp 
            JOIN users u ON rp.user_id = u.id 
            WHERE rp.report_id = ?
        `, [reportId]);
        return rows;
    }

    static async addPermission(reportId, userId, permissionLevel) {
        // Upsert permission
        await pool.execute(`
            INSERT INTO report_permissions (report_id, user_id, permission_level) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE permission_level = ?
        `, [reportId, userId, permissionLevel, permissionLevel]);
    }

    static async removePermission(reportId, userId) {
        await pool.execute('DELETE FROM report_permissions WHERE report_id = ? AND user_id = ?', [reportId, userId]);
    }

    static async hasPermission(reportId, userId, role, requiredLevel = 'view') {
        if (role === 'admin') return true;
        
        const [report] = await pool.execute('SELECT created_by, is_public FROM reports WHERE id = ?', [reportId]);
        if (!report.length) return false;
        
        if (report[0].created_by === userId) return true;
        if (requiredLevel === 'view' && report[0].is_public) return true;

        const [perm] = await pool.execute('SELECT permission_level FROM report_permissions WHERE report_id = ? AND user_id = ?', [reportId, userId]);
        if (!perm.length) return false;
        
        if (requiredLevel === 'edit') return perm[0].permission_level === 'edit';
        return true;
    }
}

module.exports = ReportModel;
