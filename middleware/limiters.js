const rateLimit = require('express-rate-limit');

const make = (windowMinutes, limit, message, extra = {}) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: message },
    ...extra,
  });

// General protection for every /api request
const apiLimiter = make(15, 300, 'Too many requests. Please slow down.');

// Login: 10 failed attempts per 15 minutes per IP (successful logins are not counted)
const loginLimiter = make(15, 10, 'Too many login attempts. Please try again in 15 minutes.', {
  skipSuccessfulRequests: true,
});

// Contact form: 5 messages per 15 minutes per IP
const contactLimiter = make(15, 5, 'You are sending messages too quickly. Please try again later.');

module.exports = { apiLimiter, loginLimiter, contactLimiter };
