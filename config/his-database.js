const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { decrypt } = require('../utils/crypto.util');

dotenv.config();

const hisPool = mysql.createPool({
    host: process.env.HIS_DB_HOST,
    user: process.env.HIS_DB_USER,
    password: decrypt(process.env.HIS_DB_PASSWORD),
    database: process.env.HIS_DB_NAME,
    port: process.env.HIS_DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = hisPool;
