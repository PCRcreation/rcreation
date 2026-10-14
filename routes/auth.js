const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const wrap = require('../utils/wrap');
const { validateNewPassword } = require('../utils/validate');
const { loginLimiter } = require('../middleware/limiters');
const { issueToken, clearToken, requireAuth, csrfGuard } = require('../middleware/auth');

const router = express.Router();
router.use(csrfGuard);

const BCRYPT_ROUNDS = 12;
const MAX_FAILED = 5;                 // lock the account after 5 wrong passwords...
const LOCK_MINUTES = 15;              // ...for 15 minutes
// Used when the email does not exist, so response time doesn't reveal which emails are real.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

const asText = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

router.post(
  '/login',
  loginLimiter,
  wrap(async (req, res) => {
    const email = asText(req.body.email, 254).trim().toLowerCase();
    const password = asText(req.body.password, 200);
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const admin = await Admin.findOne({ email });

    if (admin && admin.isLocked()) {
      return res.status(429).json({ error: 'Account temporarily locked after too many failed attempts. Try again later.' });
    }

    const passwordOk = await bcrypt.compare(password, admin ? admin.passwordHash : DUMMY_HASH);

    if (!admin || !passwordOk) {
      if (admin) {
        const updated = await Admin.findByIdAndUpdate(admin._id, { $inc: { failedLogins: 1 } }, { new: true });
        if (updated.failedLogins >= MAX_FAILED) {
          await Admin.updateOne(
            { _id: admin._id },
            { $set: { failedLogins: 0, lockUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000) } }
          );
        }
      }
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    admin.failedLogins = 0;
    admin.lockUntil = null;
    admin.lastLoginAt = new Date();
    await admin.save();

    issueToken(res, admin);
    res.json({ ok: true, email: admin.email });
  })
);

router.post('/logout', (req, res) => {
  clearToken(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ email: req.admin.email, lastLoginAt: req.admin.lastLoginAt });
});

router.post(
  '/change-password',
  requireAuth,
  wrap(async (req, res) => {
    const current = asText(req.body.currentPassword, 200);
    const next = asText(req.body.newPassword, 200);

    const ok = await bcrypt.compare(current, req.admin.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect.' });

    const problem = validateNewPassword(next, req.admin.email);
    if (problem) return res.status(400).json({ error: problem });
    if (next === current) return res.status(400).json({ error: 'New password must be different from the current one.' });

    req.admin.passwordHash = await bcrypt.hash(next, BCRYPT_ROUNDS);
    req.admin.tokenVersion += 1; // logs out every other session
    await req.admin.save();

    issueToken(res, req.admin); // keep *this* browser logged in
    res.json({ ok: true });
  })
);

module.exports = router;
