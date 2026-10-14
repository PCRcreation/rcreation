// Small, dependency-free input checks. Every value coming from a browser is untrusted.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CATEGORY_RE = /^[a-z0-9][a-z0-9 -]{0,29}$/;
// Removes invisible control characters but keeps tabs and line breaks.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const clean = (v) => (typeof v === 'string' ? v.replace(CONTROL_CHARS, '').trim() : '');

function validateContact(body = {}) {
  const errors = [];
  const name = clean(body.name);
  const email = clean(body.email).toLowerCase();
  const message = clean(body.message);

  if (!name) errors.push('Please enter your name.');
  else if (name.length > 100) errors.push('Name must be 100 characters or less.');

  if (!email) errors.push('Please enter your email.');
  else if (email.length > 254 || !EMAIL_RE.test(email)) errors.push('Please enter a valid email address.');

  if (!message) errors.push('Please write a message.');
  else if (message.length < 5) errors.push('Message is too short.');
  else if (message.length > 2000) errors.push('Message must be 2000 characters or less.');

  return { errors, data: { name, email, message } };
}

function parseTags(input) {
  let list = [];
  if (Array.isArray(input)) list = input;
  else if (typeof input === 'string') list = input.split(',');
  const seen = new Set();
  const tags = [];
  for (const item of list) {
    const t = clean(item);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(t);
  }
  return tags;
}

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateProject(body = {}) {
  const errors = [];
  const data = {};

  const title = clean(body.title);
  if (!title) errors.push('Title is required.');
  else if (title.length > 100) errors.push('Title must be 100 characters or less.');
  data.title = title;

  const description = clean(body.description);
  if (!description) errors.push('Description is required.');
  else if (description.length > 500) errors.push('Description must be 500 characters or less.');
  data.description = description;

  const category = clean(body.category).toLowerCase() || 'web';
  if (!CATEGORY_RE.test(category)) {
    errors.push('Category may only contain letters, numbers, spaces and hyphens (max 30).');
  }
  data.category = category;

  const icon = clean(body.icon) || '🚀';
  if (icon.length > 16) errors.push('Icon must be a single emoji or a very short text.');
  data.icon = icon;

  const tags = parseTags(body.tags);
  if (tags.length > 8) errors.push('Use 8 tags at most.');
  if (tags.some((t) => t.length > 30)) errors.push('Each tag must be 30 characters or less.');
  data.tags = tags;

  const link = clean(body.link);
  if (link) {
    if (link.length > 300) errors.push('Link is too long (max 300 characters).');
    else if (!isHttpUrl(link)) errors.push('Link must start with http:// or https://');
  }
  data.link = link;

  data.visible = typeof body.visible === 'boolean' ? body.visible : true;

  if (body.order !== undefined && body.order !== null && body.order !== '') {
    const n = Number(body.order);
    if (!Number.isInteger(n) || n < 0 || n > 9999) errors.push('Order must be a whole number from 0 to 9999.');
    else data.order = n;
  }

  return { errors, data };
}

function validateNewPassword(password, email = '') {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < 10) return 'Password must be at least 10 characters.';
  if (Buffer.byteLength(password, 'utf8') > 72) return 'Password is too long (max 72 bytes).';
  if (email && password.toLowerCase() === String(email).toLowerCase()) return 'Password must not be your email.';
  return null;
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { clean, validateContact, validateProject, validateNewPassword, escapeRegExp, EMAIL_RE };
