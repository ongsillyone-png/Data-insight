const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function fixPassword() {
    try {
        const hash = await bcrypt.hash('password123', 10);
        await pool.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, 'admin@example.com']);
        console.log('Password updated to password123 successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}
fixPassword();
