const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
env.assertServerConfig();

const connectDB = require('./config/db');
const { getAdmin } = require('./middleware/auth');
const { apiLimiter } = require('./middleware/limiters');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');

const app = express();
if (env.TRUST_PROXY) app.set('trust proxy', 1); // only when running behind a proxy such as Render/Nginx

/* ---------------------------- Security headers ---------------------------- */
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: env.isProd,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

/* --------------------------------- API ---------------------------------- */
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

/* ----------------------------- Admin dashboard ---------------------------- */
const adminDir = path.join(__dirname, 'admin');
const noCache = (res) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
};

// The dashboard page is only sent to logged-in admins.
app.get('/admin', async (req, res, next) => {
  try {
    const admin = await getAdmin(req);
    if (!admin) return res.redirect('/admin/login');
    noCache(res);
    res.sendFile(path.join(adminDir, 'dashboard.html'));
  } catch (err) {
    next(err);
  }
});

app.get('/admin/login', async (req, res, next) => {
  try {
    const admin = await getAdmin(req);
    if (admin) return res.redirect('/admin');
    noCache(res);
    res.sendFile(path.join(adminDir, 'login.html'));
  } catch (err) {
    next(err);
  }
});

app.use('/admin/assets', express.static(path.join(adminDir, 'assets'), { setHeaders: noCache }));
app.use('/admin', (req, res) => res.redirect('/admin'));

/* ----------------------------- Public website ----------------------------- */
// Only the "public" folder is served - your server code and .env are never exposed.
app.use(express.static(path.join(__dirname, 'public')));

/* ------------------------------ Error handling ---------------------------- */
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' });
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: env.isProd ? 'Something went wrong.' : err.message });
});

connectDB().then(() => {
  app.listen(env.PORT, () => {
    console.log(`\n🚀 Website:         http://localhost:${env.PORT}`);
    console.log(`🔐 Admin dashboard: http://localhost:${env.PORT}/admin\n`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${env.PORT} is already in use. Close the other program or change PORT in .env\n`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
});
