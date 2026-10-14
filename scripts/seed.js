// Creates the admin account (and your 3 starter projects the first time).
//   npm run seed          -> create admin if none exists
//   npm run reset-admin   -> set email/password from .env again (forgot password?)
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../config/env');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');
const Project = require('../models/Project');
const { validateNewPassword, EMAIL_RE } = require('../utils/validate');

const reset = process.argv.includes('--reset-password');

const starterProjects = [
  {
    title: 'Personal Portfolio',
    description: 'A responsive personal portfolio website to present my education, skills and work.',
    category: 'web',
    icon: '🌐',
    tags: ['HTML', 'CSS', 'JavaScript'],
    order: 1
  },
  {
    title: 'To-Do List',
    description: 'A simple task management web application for adding, completing and organizing daily tasks.',
    category: 'web',
    icon: '✅',
    tags: ['HTML', 'CSS', 'JavaScript'],
    order: 2
  },
  {
    title: 'Food Delivery',
    description: 'A food delivery web application concept for browsing food items and placing orders.',
    category: 'web',
    icon: '🍔',
    tags: ['HTML', 'CSS', 'JavaScript'],
    order: 3
  },
  {
    title: 'Reuse Market',
    description: 'A web application concept for buying and selling reusable or pre-owned products.',
    category: 'web',
    icon: '♻️',
    tags: ['HTML', 'CSS', 'JavaScript'],
    order: 4
  }
];

function stop(message) {
  console.error('\n❌ ' + message + '\n');
  process.exit(1);
}

(async () => {
  const email = env.ADMIN_EMAIL.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;

  if (!EMAIL_RE.test(email)) stop('ADMIN_EMAIL in your .env file is missing or not a valid email.');
  if (!password) stop('ADMIN_PASSWORD in your .env file is empty. Choose a password (min 10 characters).');
  const problem = validateNewPassword(password, email);
  if (problem) stop('ADMIN_PASSWORD problem: ' + problem);

  await connectDB();

  const existing = await Admin.findOne();
  if (!existing) {
    await Admin.create({ email, passwordHash: await bcrypt.hash(password, 12) });
    console.log(`✅ Admin account created: ${email}`);
  } else if (reset) {
    existing.email = email;
    existing.passwordHash = await bcrypt.hash(password, 12);
    existing.tokenVersion += 1; // logs out all old sessions
    existing.failedLogins = 0;
    existing.lockUntil = null;
    await existing.save();
    console.log(`✅ Admin login updated: ${email}`);
  } else {
    console.log(`ℹ️  An admin account already exists (${existing.email}). Nothing changed.`);
    console.log('   Forgot the password? Edit ADMIN_EMAIL / ADMIN_PASSWORD in .env and run:  npm run reset-admin');
  }

  if ((await Project.countDocuments()) === 0) {
    await Project.insertMany(starterProjects);
    console.log('✅ Added your 4 starter projects.');
  }

  await mongoose.disconnect();
  console.log('\nAll done. Start the site with:  npm run dev');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
