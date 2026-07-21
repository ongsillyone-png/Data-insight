const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { decrypt } = require('../utils/crypto.util');

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: decrypt(process.env.DB_PASSWORD),
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
