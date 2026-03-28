const cmsService = require('../services/cms.service');

async function listSurveyQuestions(req, res, next) {
  try {
    const data = await cmsService.listSurveyQuestions();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function createSurveyQuestion(req, res, next) {
  try {
    const data = await cmsService.createSurveyQuestion(req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

async function updateSurveyQuestion(req, res, next) {
  try {
    const data = await cmsService.updateSurveyQuestion(req.params.id, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function deleteSurveyQuestion(req, res, next) {
  try {
    await cmsService.deleteSurveyQuestion(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const { page, limit } = req.query;
    const { users, pagination } = await cmsService.listUsers({ page, limit });
    res.json({ data: users, pagination });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const user = await cmsService.createUser(req.body);
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await cmsService.updateUser(req.params.id, req.body);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    await cmsService.deleteUser(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSurveyQuestions,
  createSurveyQuestion,
  updateSurveyQuestion,
  deleteSurveyQuestion,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
