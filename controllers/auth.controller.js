const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');

class AuthController {
    static getLogin(req, res) {
        res.render('pages/login', { error: null });
    }

    static async postLogin(req, res) {
        try {
            const { email, password } = req.body;
            const user = await UserModel.findByEmail(email);

            if (!user) {
                return res.render('pages/login', { error: 'Invalid email or password' });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.render('pages/login', { error: 'Invalid email or password' });
            }

            if (user.status !== 'active') {
                return res.render('pages/login', { error: 'Account is inactive' });
            }

            // Save user to session
            req.session.user = {
                id: user.id,
                email: user.email,
                role: user.role
            };

            res.redirect('/');
        } catch (error) {
            console.error('Login error:', error);
            res.render('pages/login', { error: 'Internal server error' });
        }
    }

    static logout(req, res) {
        req.session.destroy(() => {
            res.redirect('/login');
        });
    }
}

module.exports = AuthController;
