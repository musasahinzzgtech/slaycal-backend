const SurveyQuestion = require('../models/SurveyQuestion');
const UserPreference = require('../models/UserPreference');
const { calculateTargets } = require('../utils/calorie');

const DIET_KEYS = ['diet', 'dietary_preferences'];
const ALLERGEN_KEYS = ['allergens'];
const GENDER_KEYS = ['gender'];
const WEIGHT_KEYS = ['weight', 'current_weight'];
const HEIGHT_KEYS = ['height'];
const AGE_KEYS = ['age'];
const ACTIVITY_KEYS = ['activity_level', 'activity'];
const GOAL_KEYS = ['goal', 'goal_type'];

function extractPreferenceFields(responses) {
  const fields = {};
  for (const { questionKey, answers } of responses) {
    const key = questionKey.toLowerCase();
    if (DIET_KEYS.some((k) => key.includes(k))) fields.dietaryPreferences = answers;
    if (ALLERGEN_KEYS.some((k) => key.includes(k))) fields.allergens = answers;
    if (GENDER_KEYS.some((k) => key.includes(k))) fields.gender = answers[0];
    if (WEIGHT_KEYS.some((k) => key.includes(k))) {
      const v = parseFloat(answers[0]);
      if (!isNaN(v)) fields.weightKg = v;
    }
    if (HEIGHT_KEYS.some((k) => key.includes(k))) {
      const v = parseFloat(answers[0]);
      if (!isNaN(v)) fields.heightCm = v;
    }
    if (AGE_KEYS.some((k) => key.includes(k))) {
      const v = parseInt(answers[0], 10);
      if (!isNaN(v)) fields.age = v;
    }
    if (ACTIVITY_KEYS.some((k) => key.includes(k))) fields.activityLevel = answers[0];
    if (GOAL_KEYS.some((k) => key.includes(k))) fields.goalType = answers[0];
  }
  return fields;
}

async function getQuestions(locale = 'en') {
  const questions = await SurveyQuestion.find({ isActive: true })
    .sort({ displayOrder: 1 })
    .lean();

  return questions.map((q) => ({
    key: q.key,
    title: q.titleI18n?.get?.(locale) || q.titleI18n?.[locale] || q.title,
    type: q.type,
    category: q.category,
    options: q.options,
    isRequired: q.isRequired,
    displayOrder: q.displayOrder,
  }));
}

async function submitSurvey(userId, responses) {
  const extracted = extractPreferenceFields(responses);
  const existing = await UserPreference.findOne({ user: userId }).lean();
  const merged = { ...(existing || {}), ...extracted };

  const targets = calculateTargets({
    gender: merged.gender,
    age: merged.age,
    heightCm: merged.heightCm,
    weightKg: merged.weightKg,
    activityLevel: merged.activityLevel,
    goalType: merged.goalType,
  });

  const update = {
    ...extracted,
    surveyResponses: responses,
    surveyCompletedAt: new Date(),
  };

  if (targets) {
    update.dailyCalorieTarget = targets.calories;
    update.dailyProteinTarget = targets.proteinG;
    update.dailyCarbsTarget = targets.carbsG;
    update.dailyFatTarget = targets.fatG;
    update.dailyWaterGoalMl = targets.waterMl;
  }

  return UserPreference.findOneAndUpdate({ user: userId }, { $set: update }, { upsert: true, new: true }).lean();
}

async function getPreferences(userId) {
  return UserPreference.findOne({ user: userId }).lean();
}

module.exports = { getQuestions, submitSurvey, getPreferences };
