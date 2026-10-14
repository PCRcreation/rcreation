// Creates your ".env" file with a strong random JWT_SECRET. Run:  npm run setup
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');

if (fs.existsSync(envPath)) {
  console.log('ℹ️  A .env file already exists - leaving it untouched.');
  process.exit(0);
}

const secret = crypto.randomBytes(48).toString('hex');
const text = fs.readFileSync(examplePath, 'utf8').replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
fs.writeFileSync(envPath, text, { mode: 0o600 });

console.log('✅ Created .env with a strong random JWT_SECRET.\n');
console.log('Next steps:');
console.log('  1. Open the ".env" file in VS Code');
console.log('  2. Set ADMIN_EMAIL and ADMIN_PASSWORD (min 10 characters) and check MONGODB_URI');
console.log('  3. Run:  npm run seed');
