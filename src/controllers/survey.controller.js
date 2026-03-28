const surveyService = require('../services/survey.service');

async function getQuestions(req, res, next) {
  try {
    const locale = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';
    const questions = await surveyService.getQuestions(locale);
    return res.json({ data: questions });
  } catch (err) {
    return next(err);
  }
}

async function submitSurvey(req, res, next) {
  try {
    const preferences = await surveyService.submitSurvey(req.user.id, req.body.responses);
    return res.json({ data: { preferences } });
  } catch (err) {
    return next(err);
  }
}

async function getPreferences(req, res, next) {
  try {
    const preferences = await surveyService.getPreferences(req.user.id);
    return res.json({ data: preferences || null });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getQuestions, submitSurvey, getPreferences };
