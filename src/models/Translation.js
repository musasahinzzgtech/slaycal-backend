const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    en: { type: String, default: '' },
    tr: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Translation', translationSchema);
