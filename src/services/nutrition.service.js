const FoodLogEntry = require('../models/FoodLogEntry');
const WaterIntake = require('../models/WaterIntake');
const WeightLog = require('../models/WeightLog');
const GoalPlan = require('../models/GoalPlan');
const UserPreference = require('../models/UserPreference');
const ApiError = require('../utils/ApiError');

// ─── Food Log ─────────────────────────────────────────────────────────────────

async function getFoodLog({ userId, startDate, endDate }) {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(`${startDate || today}T00:00:00.000Z`);
  const end = new Date(`${endDate || today}T23:59:59.999Z`);

  const [rawEntries, activePlan, prefs] = await Promise.all([
    FoodLogEntry.find({ user: userId, loggedAt: { $gte: start, $lte: end } })
      .sort({ loggedAt: 1 })
      .lean(),
    GoalPlan.findOne({ user: userId, isActive: true }).lean(),
    UserPreference.findOne({ user: userId }).lean(),
  ]);

  const targets = {
    calories: activePlan?.targetCalories || prefs?.dailyCalorieTarget || 0,
    proteinGrams: activePlan?.targetProteinG || prefs?.dailyProteinTarget || 0,
    carbsGrams: activePlan?.targetCarbsG || prefs?.dailyCarbsTarget || 0,
    fatGrams: activePlan?.targetFatG || prefs?.dailyFatTarget || 0,
  };

  // Group entries by date
  const byDate = {};
  for (const entry of rawEntries) {
    const date = entry.loggedAt.toISOString().slice(0, 10);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push({
      id: entry._id.toString(),
      mealName: entry.mealName,
      calories: entry.calories || 0,
      proteinGrams: entry.proteinGrams || 0,
      carbsGrams: entry.carbsGrams || 0,
      fatGrams: entry.fatGrams || 0,
      quantity: entry.quantity || 1,
      mealType: entry.mealType,
      loggedAt: entry.loggedAt.toISOString(),
      createdAt: entry.createdAt?.toISOString(),
      updatedAt: entry.updatedAt?.toISOString(),
    });
  }

  // Build days array with per-day summaries
  const days = Object.entries(byDate).map(([date, dayEntries]) => {
    const totalCalories = dayEntries.reduce((s, e) => s + e.calories, 0);
    const totalProteinGrams = dayEntries.reduce((s, e) => s + e.proteinGrams, 0);
    const totalCarbsGrams = dayEntries.reduce((s, e) => s + e.carbsGrams, 0);
    const totalFatGrams = dayEntries.reduce((s, e) => s + e.fatGrams, 0);
    return {
      date,
      summary: {
        totalCalories,
        totalProteinGrams,
        totalCarbsGrams,
        totalFatGrams,
        targetCalories: targets.calories,
        targetProteinGrams: targets.proteinGrams,
        targetCarbsGrams: targets.carbsGrams,
        targetFatGrams: targets.fatGrams,
      },
      entries: dayEntries,
    };
  });

  // Overall summary across all days
  const overallCalories = days.reduce((s, d) => s + d.summary.totalCalories, 0);
  const overallProtein = days.reduce((s, d) => s + d.summary.totalProteinGrams, 0);
  const overallCarbs = days.reduce((s, d) => s + d.summary.totalCarbsGrams, 0);
  const overallFat = days.reduce((s, d) => s + d.summary.totalFatGrams, 0);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    summary: {
      totalCalories: overallCalories,
      totalProteinGrams: overallProtein,
      totalCarbsGrams: overallCarbs,
      totalFatGrams: overallFat,
      targetCalories: targets.calories,
      targetProteinGrams: targets.proteinGrams,
      targetCarbsGrams: targets.carbsGrams,
      targetFatGrams: targets.fatGrams,
    },
    days,
  };
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

async function getWaterIntake({ userId, startDate, endDate }) {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(`${startDate || today}T00:00:00.000Z`);
  const end = new Date(`${endDate || today}T23:59:59.999Z`);

  const [rawEntries, prefs, activePlan] = await Promise.all([
    WaterIntake.find({ user: userId, loggedAt: { $gte: start, $lte: end } })
      .sort({ loggedAt: 1 })
      .lean(),
    UserPreference.findOne({ user: userId }).lean(),
    GoalPlan.findOne({ user: userId, isActive: true }).lean(),
  ]);

  const dailyGoalMl = activePlan?.targetWaterMl || prefs?.dailyWaterGoalMl || 2000;
  const totalIntakeMl = rawEntries.reduce((s, e) => s + e.amountMl, 0);
  const progressPercentage = dailyGoalMl > 0 ? Math.round((totalIntakeMl / dailyGoalMl) * 100) : 0;

  const entries = rawEntries.map((e) => ({
    id: e._id.toString(),
    amountMl: e.amountMl,
    loggedAt: e.loggedAt.toISOString(),
  }));

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    totalIntakeMl,
    dailyGoalMl,
    progressPercentage,
    entries,
  };
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

  // Build per-day aggregation map
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

  const days = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  const count = days.length || 1;

  const targets = {
    calories: activePlan?.targetCalories || prefs?.dailyCalorieTarget || 0,
    waterMl: activePlan?.targetWaterMl || prefs?.dailyWaterGoalMl || 0,
  };

  const avgCalories = Math.round(days.reduce((s, d) => s + d.calories, 0) / count);
  const avgWaterMl = Math.round(days.reduce((s, d) => s + d.waterMl, 0) / count);

  // Weight trend
  const weightDays = days.filter((d) => d.weightKg !== null);
  const currentKg = prefs?.weightKg || (weightDays.length ? weightDays[weightDays.length - 1].weightKg : 0);
  const firstKg = weightDays.length ? weightDays[0].weightKg : currentKg;
  const heightCm = prefs?.heightCm || 0;
  const bmi = heightCm > 0 ? Math.round((currentKg / Math.pow(heightCm / 100, 2)) * 10) / 10 : 0;

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    calorieIntake: {
      avgPerDay: avgCalories,
      targetPerDay: targets.calories,
      changePercentage: targets.calories > 0 ? Math.round(((avgCalories - targets.calories) / targets.calories) * 100) : 0,
      dailyBreakdown: days.map((d) => ({
        date: d.date,
        totalCalories: d.calories,
        totalProteinGrams: d.protein,
        totalCarbsGrams: d.carbs,
        totalFatGrams: d.fat,
      })),
    },
    waterIntake: {
      avgPerDayMl: avgWaterMl,
      dailyGoalMl: targets.waterMl,
      goalAchievementPercentage: targets.waterMl > 0 ? Math.round((avgWaterMl / targets.waterMl) * 100) : 0,
      dailyBreakdown: days.map((d) => ({
        date: d.date,
        totalMl: d.waterMl,
        targetWaterMl: targets.waterMl,
      })),
    },
    weightTrend: {
      currentKg,
      targetKg: prefs?.goalWeightKg || 0,
      changeKg: Math.round((currentKg - firstKg) * 10) / 10,
      bmi,
      heightCm,
      dailyBreakdown: weightDays.map((d) => ({
        date: d.date,
        weightKg: d.weightKg,
        targetWeightKg: prefs?.goalWeightKg || 0,
      })),
    },
  };
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
