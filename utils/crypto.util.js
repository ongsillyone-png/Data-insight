const crypto = require('crypto');

// We use SESSION_SECRET as the base for our encryption key
// It must be exactly 32 bytes for aes-256-cbc
const getMasterKey = () => {
    const secret = process.env.SESSION_SECRET || 'super-secret-key-change-me';
    return Buffer.from(secret.padEnd(32, '0').substring(0, 32));
};

const ALGO = 'aes-256-cbc';

module.exports = {
    encrypt: (text) => {
        if (!text) return text;
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGO, getMasterKey(), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        // Format: ENC:iv:encrypted_data
        return 'ENC:' + iv.toString('hex') + ':' + encrypted.toString('hex');
    },
    decrypt: (text) => {
        if (!text || !text.startsWith('ENC:')) return text; // If not encrypted, return as is
        try {
            const parts = text.substring(4).split(':');
            if (parts.length !== 2) return text;
            const iv = Buffer.from(parts[0], 'hex');
            const encryptedText = Buffer.from(parts[1], 'hex');
            const decipher = crypto.createDecipheriv(ALGO, getMasterKey(), iv);
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return decrypted.toString();
        } catch (error) {
            console.error('Decryption failed for a configuration value');
            return text;
        }
    }
};
