// Routes used by the public portfolio website (no login needed).
const express = require('express');
const Project = require('../models/Project');
const Message = require('../models/Message');
const wrap = require('../utils/wrap');
const { validateContact } = require('../utils/validate');
const { contactLimiter } = require('../middleware/limiters');

const router = express.Router();

// Visible projects, in the order chosen in the dashboard
router.get(
  '/projects',
  wrap(async (req, res) => {
    const projects = await Project.find({ visible: true })
      .sort({ order: 1, createdAt: 1 })
      .select('title description category icon tags link -_id')
      .lean();
    res.json(projects);
  })
);

// Contact form
router.post(
  '/contact',
  contactLimiter,
  wrap(async (req, res) => {
    // Honeypot: real visitors never see this hidden field, bots usually fill it in.
    if (req.body && typeof req.body.website === 'string' && req.body.website.trim() !== '') {
      return res.status(201).json({ ok: true }); // pretend success, save nothing
    }

    const { errors, data } = validateContact(req.body);
    if (errors.length) return res.status(400).json({ error: errors[0], errors });

    await Message.create(data);
    res.status(201).json({ ok: true });
  })
);

module.exports = router;
