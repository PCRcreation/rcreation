const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    category: { type: String, required: true, trim: true, lowercase: true, maxlength: 30, default: 'web' },
    icon: { type: String, trim: true, maxlength: 16, default: '🚀' },
    tags: { type: [{ type: String, trim: true, maxlength: 30 }], default: [] },
    link: { type: String, trim: true, maxlength: 300, default: '' },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

projectSchema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model('Project', projectSchema);
