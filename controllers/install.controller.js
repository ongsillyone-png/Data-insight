const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { encrypt } = require('../utils/crypto.util');

class InstallController {
    static getStep1(req, res) {
        res.render('pages/install/step1', { title: 'Step 1: System Database | Setup' });
    }

    static async postStep1(req, res) {
        try {
            const { host, port, user, password, database } = req.body;
            
            // Test connection (without database first to create it if not exists)
            const conn = await mysql.createConnection({ host, port, user, password });
            await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
            await conn.changeUser({ database });

            // Run database.sql
            const sqlPath = path.join(__dirname, '..', 'database.sql');
            if (fs.existsSync(sqlPath)) {
                const sqlStr = fs.readFileSync(sqlPath, 'utf8');
                const queries = sqlStr.split(';').filter(q => q.trim() !== '');
                for (let q of queries) {
                    if (q.trim()) {
                        await conn.query(q);
                    }
                }
            }
            await conn.end();

            // Save to session
            if (!req.session.install) req.session.install = {};
            req.session.install.db = { host, port, user, password, database };

            res.json({ success: true });
        } catch (error) {
            console.error('Install Step 1 Error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    static getStep2(req, res) {
        if (!req.session.install?.db) return res.redirect('/install');
        res.render('pages/install/step2', { title: 'Step 2: HIS Database | Setup' });
    }

    static async postStep2(req, res) {
        try {
            const { type, host, port, user, password, database } = req.body;
            
            // Optional: Test connection to HIS. For now we just save it.
            // (If it's MySQL we could test it, but they might use MSSQL/PGSQL which requires different drivers)
            if (type === 'mysql') {
                const conn = await mysql.createConnection({ host, port, user, password, database });
                await conn.end();
            }

            req.session.install.his = { type, host, port, user, password, database };
            res.json({ success: true });
        } catch (error) {
            console.error('Install Step 2 Error:', error);
            res.status(500).json({ error: 'Failed to connect to HIS: ' + error.message });
        }
    }

    static getStep3(req, res) {
        if (!req.session.install?.his) return res.redirect('/install/step2');
        res.render('pages/install/step3', { title: 'Step 3: Admin Account | Setup' });
    }

    static async postStep3(req, res) {
        try {
            const { email, password } = req.body;
            const { db, his } = req.session.install;

            // 1. Insert Admin User
            const conn = await mysql.createConnection({
                host: db.host,
                port: db.port,
                user: db.user,
                password: db.password,
                database: db.database
            });

            const hashedPassword = await bcrypt.hash(password, 10);
            await conn.query(
                'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)',
                [email, hashedPassword, 'admin']
            );
            await conn.end();

            // 2. Write to .env
            const newSecret = `super-secret-key-${crypto.randomUUID()}`;
            // Update in memory so encrypt() uses the new secret to encrypt the passwords
            process.env.SESSION_SECRET = newSecret;

            const envContent = `APP_INSTALLED=true
PORT=3000
SESSION_SECRET=${newSecret}

DB_HOST=${db.host}
DB_PORT=${db.port}
DB_USER=${db.user}
DB_PASSWORD=${encrypt(db.password)}
DB_NAME=${db.database}

HIS_DB_TYPE=${his.type}
HIS_DB_HOST=${his.host}
HIS_DB_PORT=${his.port}
HIS_DB_USER=${his.user}
HIS_DB_PASSWORD=${encrypt(his.password)}
HIS_DB_NAME=${his.database}
`;
            
            const envPath = path.join(__dirname, '..', '.env');
            fs.writeFileSync(envPath, envContent);

            // Destroy session
            req.session.destroy();

            res.json({ success: true });
        } catch (error) {
            console.error('Install Step 3 Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = InstallController;
