const pool = require('../config/database');

class ReportModel {
    static async findAll() {
        const [rows] = await pool.execute('SELECT r.*, u.email as creator_email FROM reports r LEFT JOIN users u ON r.created_by = u.id ORDER BY r.created_at DESC');
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.execute('SELECT * FROM reports WHERE id = ?', [id]);
        return rows[0];
    }

    static async create(data) {
        const { name, description, sql_query, chart_type, chart_config, created_by } = data;
        const [result] = await pool.execute(
            'INSERT INTO reports (name, description, sql_query, chart_type, chart_config, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description || '', sql_query, chart_type || 'table', JSON.stringify(chart_config || {}), created_by]
        );
        return result.insertId;
    }

    static async update(id, data) {
        const { name, description, sql_query, chart_type, chart_config } = data;
        await pool.execute(
            'UPDATE reports SET name=?, description=?, sql_query=?, chart_type=?, chart_config=? WHERE id=?',
            [name, description, sql_query, chart_type, JSON.stringify(chart_config), id]
        );
    }

    static async delete(id) {
        await pool.execute('DELETE FROM reports WHERE id = ?', [id]);
    }
}

module.exports = ReportModel;
