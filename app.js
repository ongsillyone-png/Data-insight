const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');

// Load env vars
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'super-secret-key',
    resave: false,
    saveUninitialized: false
}));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Setup Wizard Middleware
app.use((req, res, next) => {
    // If installed, block access to /install unless it's a static asset
    const isInstalled = process.env.APP_INSTALLED === 'true';
    const isInstallRoute = req.path.startsWith('/install');
    const isApiInstallRoute = req.path.startsWith('/api/install');
    const isStatic = req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/i);

    if (isStatic) return next();

    if (!isInstalled && !isInstallRoute && !isApiInstallRoute) {
        return res.redirect('/install');
    }
    
    if (isInstalled && (isInstallRoute || isApiInstallRoute)) {
        return res.redirect('/');
    }

    next();
});

// Routes
app.use('/install', require('./routes/web/install.routes'));
app.use('/api/install', require('./routes/api/install.routes'));

app.use('/', require('./routes/web/index'));
app.use('/api', require('./routes/api/index'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
