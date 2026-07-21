require('dotenv').config();
const { encrypt } = require('./utils/crypto.util');

const plainText = process.argv[2];

if (!plainText) {
    console.log('Usage: node encrypt-password.js "your_database_password"');
    process.exit(1);
}

const encrypted = encrypt(plainText);

console.log('\n========================================================');
console.log('🔒 SUCCESS! Here is your encrypted password:');
console.log('========================================================\n');
console.log(encrypted);
console.log('\n========================================================');
console.log('👉 Copy the entire string above (including ENC:)');
console.log('👉 Paste it into your .env file as DB_PASSWORD or HIS_DB_PASSWORD');
console.log('========================================================\n');
