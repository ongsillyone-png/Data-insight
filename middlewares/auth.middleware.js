module.exports = {
    isAuthenticated: (req, res, next) => {
        if (req.session && req.session.user) {
            return next();
        }
        if (req.originalUrl && req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ error: 'Unauthorized: Please log in' });
        }
        res.redirect('/login');
    },
    isGuest: (req, res, next) => {
        if (req.session && req.session.user) {
            return res.redirect('/');
        }
        next();
    },
    hasRole: (roles) => {
        return (req, res, next) => {
            if (req.session && req.session.user && roles.includes(req.session.user.role)) {
                return next();
            }
            if (req.originalUrl && req.originalUrl.startsWith('/api')) {
                return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            }
            res.status(403).send('Forbidden: You do not have permission to access this resource.');
        };
    }
};
