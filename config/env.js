// Loads and checks settings from the ".env" file.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/portfolio_admin',
  JWT_SECRET: process.env.JWT_SECRET || '',
  SESSION_HOURS: Math.min(Math.max(parseInt(process.env.SESSION_HOURS, 10) || 2, 1), 72),
  TRUST_PROXY: process.env.TRUST_PROXY === 'true',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
};

env.isProd = env.NODE_ENV === 'production';
// Cookies are marked "secure" (HTTPS only) in production. Override with COOKIE_SECURE=true/false.
env.COOKIE_SECURE =
  process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : env.isProd;

// Called by server.js before starting. Stops the server with a clear message if something is wrong.
env.assertServerConfig = function assertServerConfig() {
  const secret = env.JWT_SECRET;
  if (!secret || secret.length < 32 || /change|example|secret123/i.test(secret)) {
    console.error('\n❌ JWT_SECRET is missing or too weak.');
    console.error('   Run:  npm run setup   (it creates your .env with a strong random secret)\n');
    process.exit(1);
  }
};

module.exports = env;
