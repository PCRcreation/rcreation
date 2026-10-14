// Everything in this file requires a logged-in admin.
const express = require('express');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Message = require('../models/Message');
const wrap = require('../utils/wrap');
const { validateProject, escapeRegExp } = require('../utils/validate');
const { requireAuth, csrfGuard } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, csrfGuard);

const validId = (id) => typeof id === 'string' && mongoose.isValidObjectId(id);
const badId = (res) => res.status(400).json({ error: 'Invalid id.' });
const notFound = (res, what) => res.status(404).json({ error: `${what} not found.` });

/* ------------------------------ Overview ------------------------------ */
router.get(
  '/stats',
  wrap(async (req, res) => {
    const [projectsTotal, projectsVisible, messagesTotal, messagesUnread, recent] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ visible: true }),
      Message.countDocuments(),
      Message.countDocuments({ read: false }),
      Message.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);
    res.json({
      projects: { total: projectsTotal, visible: projectsVisible },
      messages: { total: messagesTotal, unread: messagesUnread },
      recentMessages: recent,
    });
  })
);

/* ------------------------------ Projects ------------------------------ */
router.get(
  '/projects',
  wrap(async (req, res) => {
    const projects = await Project.find().sort({ order: 1, createdAt: 1 }).lean();
    res.json(projects);
  })
);

router.post(
  '/projects',
  wrap(async (req, res) => {
    const { errors, data } = validateProject(req.body);
    if (errors.length) return res.status(400).json({ error: errors[0], errors });

    if (data.order === undefined) {
      const last = await Project.findOne().sort({ order: -1 }).select('order').lean();
      data.order = last ? last.order + 1 : 1;
    }
    const project = await Project.create(data);
    res.status(201).json(project);
  })
);

router.put(
  '/projects/:id',
  wrap(async (req, res) => {
    if (!validId(req.params.id)) return badId(res);
    const { errors, data } = validateProject(req.body);
    if (errors.length) return res.status(400).json({ error: errors[0], errors });

    const project = await Project.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    if (!project) return notFound(res, 'Project');
    res.json(project);
  })
);

router.patch(
  '/projects/:id/visibility',
  wrap(async (req, res) => {
    if (!validId(req.params.id)) return badId(res);
    if (typeof req.body.visible !== 'boolean') return res.status(400).json({ error: '"visible" must be true or false.' });
    const project = await Project.findByIdAndUpdate(req.params.id, { $set: { visible: req.body.visible } }, { new: true });
    if (!project) return notFound(res, 'Project');
    res.json(project);
  })
);

router.delete(
  '/projects/:id',
  wrap(async (req, res) => {
    if (!validId(req.params.id)) return badId(res);
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return notFound(res, 'Project');
    res.json({ ok: true });
  })
);

/* ------------------------------ Messages ------------------------------ */
router.get(
  '/messages',
  wrap(async (req, res) => {
    const filter = {};
    const status = typeof req.query.filter === 'string' ? req.query.filter : 'all';
    if (status === 'unread') filter.read = false;
    if (status === 'read') filter.read = true;

    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    if (search) {
      const rx = new RegExp(escapeRegExp(search), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { message: rx }];
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const [items, total, unread] = await Promise.all([
      Message.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Message.countDocuments(filter),
      Message.countDocuments({ read: false }),
    ]);
    res.json({ items, total, unread, page, pages: Math.max(Math.ceil(total / limit), 1) });
  })
);

// Keep this route above "/messages/:id" so "mark-all-read" is not treated as an id.
router.post(
  '/messages/mark-all-read',
  wrap(async (req, res) => {
    const result = await Message.updateMany({ read: false }, { $set: { read: true } });
    res.json({ ok: true, updated: result.modifiedCount });
  })
);

router.patch(
  '/messages/:id',
  wrap(async (req, res) => {
    if (!validId(req.params.id)) return badId(res);
    if (typeof req.body.read !== 'boolean') return res.status(400).json({ error: '"read" must be true or false.' });
    const msg = await Message.findByIdAndUpdate(req.params.id, { $set: { read: req.body.read } }, { new: true });
    if (!msg) return notFound(res, 'Message');
    res.json(msg);
  })
);

router.delete(
  '/messages/:id',
  wrap(async (req, res) => {
    if (!validId(req.params.id)) return badId(res);
    const msg = await Message.findByIdAndDelete(req.params.id);
    if (!msg) return notFound(res, 'Message');
    res.json({ ok: true });
  })
);

module.exports = router;
