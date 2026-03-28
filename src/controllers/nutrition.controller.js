const nutritionService = require('../services/nutrition.service');

// ─── Food Log ─────────────────────────────────────────────────────────────────

async function getFoodLog(req, res, next) {
  try {
    const result = await nutritionService.getFoodLog({
      userId: req.user.id,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    return res.json({ data: result });
  } catch (err) {
    return next(err);
  }
}

async function createFoodLog(req, res, next) {
  try {
    const foodLog = await nutritionService.createFoodLog({ userId: req.user.id, data: req.body });
    return res.status(201).json({ data: { foodLog } });
  } catch (err) {
    return next(err);
  }
}

async function updateFoodLog(req, res, next) {
  try {
    const foodLog = await nutritionService.updateFoodLog({
      userId: req.user.id,
      id: req.params.id,
      data: req.body,
    });
    return res.json({ data: { foodLog } });
  } catch (err) {
    return next(err);
  }
}

async function deleteFoodLog(req, res, next) {
  try {
    await nutritionService.deleteFoodLog({ userId: req.user.id, id: req.params.id });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

// ─── Water Intake ─────────────────────────────────────────────────────────────

async function getWaterIntake(req, res, next) {
  try {
    const result = await nutritionService.getWaterIntake({
      userId: req.user.id,
      date: req.query.date,
    });
    return res.json({ data: result });
  } catch (err) {
    return next(err);
  }
}

async function createWaterIntake(req, res, next) {
  try {
    const waterIntake = await nutritionService.createWaterIntake({
      userId: req.user.id,
      data: req.body,
    });
    return res.status(201).json({ data: { waterIntake } });
  } catch (err) {
    return next(err);
  }
}

async function deleteWaterIntake(req, res, next) {
  try {
    await nutritionService.deleteWaterIntake({ userId: req.user.id, id: req.params.id });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

// ─── Progress ─────────────────────────────────────────────────────────────────

async function getProgress(req, res, next) {
  try {
    const result = await nutritionService.getProgress({
      userId: req.user.id,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    return res.json({ data: result });
  } catch (err) {
    return next(err);
  }
}

// ─── Weight Log ───────────────────────────────────────────────────────────────

async function createWeightLog(req, res, next) {
  try {
    const weightLog = await nutritionService.createWeightLog({
      userId: req.user.id,
      data: req.body,
    });
    return res.status(201).json({ data: { weightLog } });
  } catch (err) {
    return next(err);
  }
}

// ─── Goal Plans ───────────────────────────────────────────────────────────────

async function getActiveGoalPlan(req, res, next) {
  try {
    const goalPlan = await nutritionService.getActiveGoalPlan(req.user.id);
    return res.json({ data: goalPlan || null });
  } catch (err) {
    return next(err);
  }
}

async function createGoalPlan(req, res, next) {
  try {
    const goalPlan = await nutritionService.createGoalPlan({
      userId: req.user.id,
      data: req.body,
    });
    return res.status(201).json({ data: { goalPlan } });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getFoodLog,
  createFoodLog,
  updateFoodLog,
  deleteFoodLog,
  getWaterIntake,
  createWaterIntake,
  deleteWaterIntake,
  getProgress,
  createWeightLog,
  getActiveGoalPlan,
  createGoalPlan,
};
