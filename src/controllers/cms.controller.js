const cmsService = require('../services/cms.service');
const Recipe = require('../models/Recipe');
const { uploadBuffer } = require('../services/storage.service');

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

async function listRecipes(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const [recipes, total] = await Promise.all([
      Recipe.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Recipe.countDocuments(),
    ]);
    res.json({ data: recipes, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

async function _uploadRecipeImage(file) {
  const ext = file.originalname.split('.').pop() || 'jpg';
  const destination = `recipes/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  return uploadBuffer(file.buffer, destination, file.mimetype);
}

async function createRecipe(req, res, next) {
  try {
    // Fields come as a JSON string in `data` when multipart, or plain JSON body
    const body = req.body.data ? JSON.parse(req.body.data) : req.body;
    if (req.file) {
      body.imageUrl = await _uploadRecipeImage(req.file);
    }
    const recipe = await Recipe.create(body);
    res.status(201).json({ data: recipe });
  } catch (err) {
    next(err);
  }
}

async function updateRecipe(req, res, next) {
  try {
    const body = req.body.data ? JSON.parse(req.body.data) : req.body;
    if (req.file) {
      body.imageUrl = await _uploadRecipeImage(req.file);
    }
    const recipe = await Recipe.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true }).lean();
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json({ data: recipe });
  } catch (err) {
    next(err);
  }
}

async function deleteRecipe(req, res, next) {
  try {
    const recipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
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
  listRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
};
