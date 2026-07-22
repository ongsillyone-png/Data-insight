const pool = require('../config/database');

class DashboardModel {
    static async findAll() {
        const [rows] = await pool.execute('SELECT d.*, u.email as creator_email FROM dashboards d LEFT JOIN users u ON d.created_by = u.id ORDER BY d.created_at DESC');
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.execute('SELECT * FROM dashboards WHERE id = ?', [id]);
        return rows[0];
    }

    static async create(data) {
        const { name, layout_config, created_by } = data;
        const [result] = await pool.execute(
            'INSERT INTO dashboards (name, layout_config, created_by) VALUES (?, ?, ?)',
            [name, JSON.stringify(layout_config || []), created_by]
        );
        return result.insertId;
    }

    static async update(id, data) {
        const { name, layout_config } = data;
        await pool.execute(
            'UPDATE dashboards SET name=?, layout_config=? WHERE id=?',
            [name, JSON.stringify(layout_config || []), id]
        );
    }

    static async delete(id) {
        await pool.execute('DELETE FROM dashboards WHERE id = ?', [id]);
    }
}

module.exports = DashboardModel;
