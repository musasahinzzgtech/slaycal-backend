const UserPreference = require('../models/UserPreference');
const { calculateTargets } = require('../utils/calorie');

const PERSONAL_FIELDS = ['gender', 'age', 'heightCm', 'weightKg', 'goalWeightKg', 'activityLevel', 'goalType'];
const RECALC_TRIGGERS = ['weightKg', 'heightCm', 'age', 'gender', 'activityLevel', 'goalType'];

function pickPersonalDetails(prefs) {
  return Object.fromEntries(PERSONAL_FIELDS.map((f) => [f, prefs?.[f]]));
}

async function getPersonalDetails(userId) {
  const prefs = await UserPreference.findOne({ user: userId })
    .select(PERSONAL_FIELDS.join(' '))
    .lean();
  return prefs ? pickPersonalDetails(prefs) : null;
}

async function updatePersonalDetails(userId, body) {
  // Map mobile field names → DB field names
  const mapped = {};
  if (body.currentWeight !== undefined) mapped.weightKg = body.currentWeight;
  if (body.goalWeight !== undefined) mapped.goalWeightKg = body.goalWeight;
  if (body.height !== undefined) mapped.heightCm = body.height;
  if (body.gender !== undefined) mapped.gender = body.gender;
  if (body.age !== undefined) mapped.age = body.age;
  if (body.activityLevel !== undefined) mapped.activityLevel = body.activityLevel;
  if (body.goalType !== undefined) mapped.goalType = body.goalType;

  const needsRecalc = RECALC_TRIGGERS.some((f) => mapped[f] !== undefined);

  if (needsRecalc) {
    const existing = await UserPreference.findOne({ user: userId }).lean();
    const merged = { ...(existing || {}), ...mapped };

    const targets = calculateTargets({
      gender: merged.gender,
      age: merged.age,
      heightCm: merged.heightCm,
      weightKg: merged.weightKg,
      activityLevel: merged.activityLevel,
      goalType: merged.goalType,
    });

    if (targets) {
      mapped.dailyCalorieTarget = targets.calories;
      mapped.dailyProteinTarget = targets.proteinG;
      mapped.dailyCarbsTarget = targets.carbsG;
      mapped.dailyFatTarget = targets.fatG;
      mapped.dailyWaterGoalMl = targets.waterMl;
    }
  }

  const updated = await UserPreference.findOneAndUpdate(
    { user: userId },
    { $set: mapped },
    { upsert: true, new: true }
  ).lean();

  return pickPersonalDetails(updated);
}

module.exports = { getPersonalDetails, updatePersonalDetails };
