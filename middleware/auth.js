const jwt = require('jsonwebtoken');
const env = require('../config/env');
const Admin = require('../models/Admin');

const COOKIE_NAME = 'admin_token';

const baseCookie = () => ({
  httpOnly: true,          // JavaScript in the page can never read this cookie
  sameSite: 'strict',      // never sent from other websites (blocks CSRF)
  secure: env.COOKIE_SECURE,
  path: '/',
});

function issueToken(res, admin) {
  const token = jwt.sign({ sub: String(admin._id), v: admin.tokenVersion }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${env.SESSION_HOURS}h`,
  });
  res.cookie(COOKIE_NAME, token, { ...baseCookie(), maxAge: env.SESSION_HOURS * 3600 * 1000 });
}

function clearToken(res) {
  res.clearCookie(COOKIE_NAME, baseCookie());
}

// Returns the logged-in admin document, or null.
async function getAdmin(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token || typeof token !== 'string') return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    const admin = await Admin.findById(payload.sub);
    if (!admin || admin.tokenVersion !== payload.v) return null;
    return admin;
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  try {
    const admin = await getAdmin(req);
    if (!admin) return res.status(401).json({ error: 'Please log in.' });
    req.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
}

// Extra CSRF protection: browsers cannot add this custom header on a cross-site request
// unless we allow it (we do not). Our own pages always send it.
function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'Request blocked (missing security header).' });
  }
  next();
}

module.exports = { issueToken, clearToken, getAdmin, requireAuth, csrfGuard };
