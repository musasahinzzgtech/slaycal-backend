const Translation = require('../models/Translation');
const ApiError = require('../utils/ApiError');

const SUPPORTED_LOCALES = ['en', 'tr'];

// Flatten a nested object into dot-notation keys, arrays become "key.0", "key.1", etc.
function flatten(obj, prefix = '', result = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === 'object') {
          flatten(item, `${fullKey}.${i}`, result);
        } else {
          result[`${fullKey}.${i}`] = String(item ?? '');
        }
      });
    } else if (v !== null && typeof v === 'object') {
      flatten(v, fullKey, result);
    } else {
      result[fullKey] = String(v ?? '');
    }
  }
  return result;
}

// Reconstruct a nested object from dot-notation keys
function unflatten(flat) {
  const result = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let cur = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      const nextSeg = parts[i + 1];
      if (!(seg in cur)) cur[seg] = /^\d+$/.test(nextSeg) ? [] : {};
      cur = cur[seg];
    }
    const last = parts[parts.length - 1];
    if (Array.isArray(cur)) cur[Number(last)] = value;
    else cur[last] = value;
  }
  return result;
}

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

// Returns a nested object for the given locale (falls back to 'en')
// Nested so i18next addResourceBundle deep-merge correctly overrides static bundles
async function getLocaleMap(locale) {
  const lang = SUPPORTED_LOCALES.includes(locale) ? locale : 'en';
  const docs = await Translation.find().lean();
  const flat = {};
  for (const doc of docs) {
    flat[doc.key] = doc[lang] || doc.en || '';
  }
  return unflatten(flat);
}

// Bulk upsert: accepts array of { key, en, tr }
async function bulkUpsertTranslations(entries) {
  if (!entries.length) return { upserted: 0 };
  const ops = entries.map(({ key, en, tr }) => ({
    updateOne: {
      filter: { key },
      update: { $set: { en: en ?? '', tr: tr ?? '' } },
      upsert: true,
    },
  }));
  const result = await Translation.bulkWrite(ops, { ordered: false });
  return { upserted: result.upsertedCount + result.modifiedCount };
}

module.exports = { listTranslations, getTranslationByKey, upsertTranslation, deleteTranslation, getLocaleMap, bulkUpsertTranslations, flatten };
