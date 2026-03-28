const translationService = require('../services/translation.service');

async function listTranslations(req, res, next) {
  try {
    res.json({ data: await translationService.listTranslations() });
  } catch (err) {
    next(err);
  }
}

async function getTranslation(req, res, next) {
  try {
    res.json({ data: await translationService.getTranslationByKey(req.params.key) });
  } catch (err) {
    next(err);
  }
}

async function upsertTranslation(req, res, next) {
  try {
    const data = await translationService.upsertTranslation(req.params.key, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function deleteTranslation(req, res, next) {
  try {
    await translationService.deleteTranslation(req.params.key);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// Public endpoint for mobile app — reads locale from Accept-Language header
async function getLocaleTranslations(req, res, next) {
  try {
    const locale = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';
    res.json({ data: await translationService.getLocaleMap(locale) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listTranslations, getTranslation, upsertTranslation, deleteTranslation, getLocaleTranslations };
