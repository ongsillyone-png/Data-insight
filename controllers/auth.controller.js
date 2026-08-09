const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');

// ── Brute-Force Protection (In-Memory) ──────────────────────────────────────
// Keyed by IP address: { count: number, lockedUntil: Date|null, lastAttempt: Date }
const loginAttempts = new Map();

const MAX_ATTEMPTS   = 5;           // จำนวนครั้งสูงสุดที่ยอมให้ลองผิด
const LOCKOUT_MS     = 5 * 60 * 1000; // 5 นาที (มิลลิวินาที)
const WINDOW_MS      = 15 * 60 * 1000; // รีเซ็ตนับถ้าไม่มีการพยายามใน 15 นาที

function getClientIp(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown'
    );
}

function checkRateLimit(ip) {
    const now = Date.now();
    const record = loginAttempts.get(ip);

    if (!record) return { blocked: false, remainingMs: 0, attemptsLeft: MAX_ATTEMPTS };

    // ถ้ากำลัง lock อยู่
    if (record.lockedUntil && now < record.lockedUntil) {
        return {
            blocked: true,
            remainingMs: record.lockedUntil - now,
            attemptsLeft: 0
        };
    }

    // ถ้าหน้าต่างเวลาผ่านไปแล้ว — รีเซ็ต
    if (now - record.lastAttempt > WINDOW_MS) {
        loginAttempts.delete(ip);
        return { blocked: false, remainingMs: 0, attemptsLeft: MAX_ATTEMPTS };
    }

    return {
        blocked: false,
        remainingMs: 0,
        attemptsLeft: Math.max(0, MAX_ATTEMPTS - record.count)
    };
}

function recordFailedAttempt(ip) {
    const now = Date.now();
    const record = loginAttempts.get(ip) || { count: 0, lockedUntil: null, lastAttempt: now };

    record.count += 1;
    record.lastAttempt = now;

    if (record.count >= MAX_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_MS;
    }

    loginAttempts.set(ip, record);
    return record;
}

function resetAttempts(ip) {
    loginAttempts.delete(ip);
}

function formatRemaining(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    if (min > 0) return `${min} นาที ${sec > 0 ? sec + ' วินาที' : ''}`.trim();
    return `${sec} วินาที`;
}
// ─────────────────────────────────────────────────────────────────────────────

class AuthController {
    static getLogin(req, res) {
        res.render('pages/login', { error: null, warning: null });
    }

    static async postLogin(req, res) {
        const ip = getClientIp(req);

        // 1. ตรวจสอบ Rate Limit ก่อนทุกอย่าง
        const limit = checkRateLimit(ip);
        if (limit.blocked) {
            return res.render('pages/login', {
                error: `⚠️ บัญชีถูกล็อคชั่วคราว กรุณารอ ${formatRemaining(limit.remainingMs)} แล้วลองใหม่อีกครั้ง`,
                warning: null
            });
        }

        try {
            const { email, password } = req.body;
            const user = await UserModel.findByEmail(email);

            // 2. ผู้ใช้ไม่มีในระบบ
            if (!user) {
                const record = recordFailedAttempt(ip);
                const left = MAX_ATTEMPTS - record.count;
                const msg = left > 0
                    ? `อีเมลหรือรหัสผ่านไม่ถูกต้อง (เหลือโอกาสอีก ${left} ครั้ง)`
                    : `อีเมลหรือรหัสผ่านไม่ถูกต้อง — บัญชีถูกล็อค 5 นาที`;
                return res.render('pages/login', { error: msg, warning: null });
            }

            // 3. รหัสผ่านผิด
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                const record = recordFailedAttempt(ip);
                const left = MAX_ATTEMPTS - record.count;
                const msg = left > 0
                    ? `อีเมลหรือรหัสผ่านไม่ถูกต้อง (เหลือโอกาสอีก ${left} ครั้ง)`
                    : `พยายามเข้าสู่ระบบผิดเกิน ${MAX_ATTEMPTS} ครั้ง — กรุณารอ 5 นาทีแล้วลองใหม่`;
                return res.render('pages/login', { error: msg, warning: null });
            }

            // 4. บัญชีไม่ active
            if (user.status !== 'active') {
                return res.render('pages/login', { error: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ', warning: null });
            }

            // 5. เข้าสู่ระบบสำเร็จ — ล้างนับ
            resetAttempts(ip);

            req.session.user = {
                id: user.id,
                email: user.email,
                role: user.role
            };

            res.redirect('/');
        } catch (error) {
            console.error('Login error:', error);
            res.render('pages/login', { error: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', warning: null });
        }
    }

    static logout(req, res) {
        req.session.destroy(() => {
            res.redirect('/login');
        });
    }
}

module.exports = AuthController;
