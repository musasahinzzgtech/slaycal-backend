const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    userType: { type: String, enum: ['anonymous', 'registered'], default: 'anonymous' },
    deviceId: { type: String },
    platform: { type: String },
    appVersion: { type: String },
    locale: { type: String, default: 'en' },
    refreshToken: { type: String },
    roles: { type: [String], default: ['user'] },
  },
  { timestamps: true }
);

userSchema.index({ deviceId: 1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);
