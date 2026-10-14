const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true },
    // Brute-force protection
    failedLogins: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    // Increase this number to instantly log out every existing session
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

adminSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil.getTime() > Date.now());
};

module.exports = mongoose.model('Admin', adminSchema);
