const FoodLogEntry = require('../models/FoodLogEntry');
const WaterIntake = require('../models/WaterIntake');
const WeightLog = require('../models/WeightLog');
const GoalPlan = require('../models/GoalPlan');
const UserPreference = require('../models/UserPreference');
const ApiError = require('../utils/ApiError');

// ─── Food Log ─────────────────────────────────────────────────────────────────

async function getFoodLog({ userId, startDate, endDate }) {
  const start = startDate
    ? new Date(`${startDate}T00:00:00.000Z`)
    : new Date(new Date().setHours(0, 0, 0, 0));
  const end = endDate
    ? new Date(`${endDate}T23:59:59.999Z`)
    : new Date(new Date().setHours(23, 59, 59, 999));

  const entries = await FoodLogEntry.find({
    user: userId,
    loggedAt: { $gte: start, $lte: end },
  })
    .sort({ loggedAt: 1 })
    .lean();

  const byDate = {};
  for (const entry of entries) {
    const date = entry.loggedAt.toISOString().slice(0, 10);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(entry);
  }

  const dailySummaries = Object.entries(byDate).map(([date, dayEntries]) => ({
    date,
    totalCalories: dayEntries.reduce((s, e) => s + (e.calories || 0), 0),
    totalProtein: dayEntries.reduce((s, e) => s + (e.proteinGrams || 0), 0),
    totalCarbs: dayEntries.reduce((s, e) => s + (e.carbsGrams || 0), 0),
    totalFat: dayEntries.reduce((s, e) => s + (e.fatGrams || 0), 0),
  }));

  return { entries, dailySummaries };
}

async function createFoodLog({ userId, data }) {
  const entry = { ...data, user: userId };
  if (entry.loggedAt) entry.loggedAt = new Date(entry.loggedAt);
  return FoodLogEntry.create(entry);
}

async function updateFoodLog({ userId, id, data }) {
  const entry = await FoodLogEntry.findById(id);
  if (!entry) throw new ApiError(404, 'Food log entry not found', 'NOT_FOUND');
  if (entry.user.toString() !== userId) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  Object.assign(entry, data);
  return entry.save();
}

async function deleteFoodLog({ userId, id }) {
  const entry = await FoodLogEntry.findById(id);
  if (!entry) throw new ApiError(404, 'Food log entry not found', 'NOT_FOUND');
  if (entry.user.toString() !== userId) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  await entry.deleteOne();
}

// ─── Water Intake ─────────────────────────────────────────────────────────────

async function getWaterIntake({ userId, date }) {
  const dateStr = date || new Date().toISOString().slice(0, 10);
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);

  const entries = await WaterIntake.find({
    user: userId,
    loggedAt: { $gte: start, $lte: end },
  })
    .sort({ loggedAt: 1 })
    .lean();

  const totalMl = entries.reduce((s, e) => s + e.amountMl, 0);

  const [prefs, activePlan] = await Promise.all([
    UserPreference.findOne({ user: userId }).lean(),
    GoalPlan.findOne({ user: userId, isActive: true }).lean(),
  ]);
  const goalMl = activePlan?.targetWaterMl || prefs?.dailyWaterGoalMl || 2000;

  return { entries, totalMl, goalMl };
}

async function createWaterIntake({ userId, data }) {
  const entry = { ...data, user: userId };
  if (entry.loggedAt) entry.loggedAt = new Date(entry.loggedAt);
  return WaterIntake.create(entry);
}

async function deleteWaterIntake({ userId, id }) {
  const entry = await WaterIntake.findById(id);
  if (!entry) throw new ApiError(404, 'Water intake entry not found', 'NOT_FOUND');
  if (entry.user.toString() !== userId) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  await entry.deleteOne();
}

// ─── Progress ─────────────────────────────────────────────────────────────────

async function getProgress({ userId, startDate, endDate }) {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(`${startDate || today}T00:00:00.000Z`);
  const end = new Date(`${endDate || today}T23:59:59.999Z`);

  const [foodEntries, waterEntries, weightLogs, activePlan, prefs] = await Promise.all([
    FoodLogEntry.find({ user: userId, loggedAt: { $gte: start, $lte: end } }).lean(),
    WaterIntake.find({ user: userId, loggedAt: { $gte: start, $lte: end } }).lean(),
    WeightLog.find({ user: userId, loggedAt: { $gte: start, $lte: end } })
      .sort({ loggedAt: 1 })
      .lean(),
    GoalPlan.findOne({ user: userId, isActive: true }).lean(),
    UserPreference.findOne({ user: userId }).lean(),
  ]);

  const dayMap = {};
  const addDay = (d) => {
    if (!dayMap[d]) dayMap[d] = { date: d, calories: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0, weightKg: null };
  };

  for (const e of foodEntries) {
    const d = e.loggedAt.toISOString().slice(0, 10);
    addDay(d);
    dayMap[d].calories += e.calories || 0;
    dayMap[d].protein += e.proteinGrams || 0;
    dayMap[d].carbs += e.carbsGrams || 0;
    dayMap[d].fat += e.fatGrams || 0;
  }
  for (const w of waterEntries) {
    const d = w.loggedAt.toISOString().slice(0, 10);
    addDay(d);
    dayMap[d].waterMl += w.amountMl || 0;
  }
  for (const w of weightLogs) {
    const d = w.loggedAt.toISOString().slice(0, 10);
    addDay(d);
    dayMap[d].weightKg = w.weightKg;
  }

  const dailyBreakdown = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  const count = dailyBreakdown.length || 1;

  const targets = {
    calories: activePlan?.targetCalories || prefs?.dailyCalorieTarget || null,
    protein: activePlan?.targetProteinG || prefs?.dailyProteinTarget || null,
    carbs: activePlan?.targetCarbsG || prefs?.dailyCarbsTarget || null,
    fat: activePlan?.targetFatG || prefs?.dailyFatTarget || null,
    waterMl: activePlan?.targetWaterMl || prefs?.dailyWaterGoalMl || null,
  };

  const averages = {
    calories: Math.round(dailyBreakdown.reduce((s, d) => s + d.calories, 0) / count),
    protein: Math.round(dailyBreakdown.reduce((s, d) => s + d.protein, 0) / count),
    carbs: Math.round(dailyBreakdown.reduce((s, d) => s + d.carbs, 0) / count),
    fat: Math.round(dailyBreakdown.reduce((s, d) => s + d.fat, 0) / count),
    waterMl: Math.round(dailyBreakdown.reduce((s, d) => s + d.waterMl, 0) / count),
  };

  return { dailyBreakdown, targets, averages, weightLogs };
}

// ─── Weight Log ───────────────────────────────────────────────────────────────

async function createWeightLog({ userId, data }) {
  const entry = { ...data, user: userId };
  if (entry.loggedAt) entry.loggedAt = new Date(entry.loggedAt);

  const weightLog = await WeightLog.create(entry);

  await UserPreference.findOneAndUpdate(
    { user: userId },
    { $set: { weightKg: data.weightKg } },
    { upsert: true }
  );

  return weightLog;
}

// ─── Goal Plans ───────────────────────────────────────────────────────────────

async function getActiveGoalPlan(userId) {
  return GoalPlan.findOne({ user: userId, isActive: true }).lean();
}

async function createGoalPlan({ userId, data }) {
  await GoalPlan.updateMany({ user: userId, isActive: true }, { $set: { isActive: false } });

  const goalPlan = await GoalPlan.create({
    ...data,
    user: userId,
    isActive: true,
    effectiveFrom: new Date(),
  });

  const prefUpdate = {};
  if (data.targetCalories) prefUpdate.dailyCalorieTarget = data.targetCalories;
  if (data.targetProteinG) prefUpdate.dailyProteinTarget = data.targetProteinG;
  if (data.targetCarbsG) prefUpdate.dailyCarbsTarget = data.targetCarbsG;
  if (data.targetFatG) prefUpdate.dailyFatTarget = data.targetFatG;
  if (data.targetWaterMl) prefUpdate.dailyWaterGoalMl = data.targetWaterMl;

  if (Object.keys(prefUpdate).length) {
    await UserPreference.findOneAndUpdate(
      { user: userId },
      { $set: prefUpdate },
      { upsert: true }
    );
  }

  return goalPlan;
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
