const Translation = require('../models/Translation');
const ApiError = require('../utils/ApiError');

const SUPPORTED_LOCALES = ['en', 'tr'];

async function listTranslations() {
  return Translation.find().sort({ key: 1 }).lean();
}

async function getTranslationByKey(key) {
  const doc = await Translation.findOne({ key }).lean();
  if (!doc) throw new ApiError(404, 'Translation not found', 'NOT_FOUND');
  return doc;
}

async function upsertTranslation(key, { en, tr }) {
  return Translation.findOneAndUpdate(
    { key },
    { $set: { en: en ?? '', tr: tr ?? '' } },
    { new: true, upsert: true, runValidators: true }
  ).lean();
}

async function deleteTranslation(key) {
  const doc = await Translation.findOneAndDelete({ key }).lean();
  if (!doc) throw new ApiError(404, 'Translation not found', 'NOT_FOUND');
}

// Returns a flat { key: value } map for the given locale (falls back to 'en')
async function getLocaleMap(locale) {
  const lang = SUPPORTED_LOCALES.includes(locale) ? locale : 'en';
  const docs = await Translation.find().lean();
  const result = {};
  for (const doc of docs) {
    result[doc.key] = doc[lang] || doc.en || '';
  }
  return result;
}

module.exports = { listTranslations, getTranslationByKey, upsertTranslation, deleteTranslation, getLocaleMap };
