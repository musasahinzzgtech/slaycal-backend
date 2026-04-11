const SurveyQuestion = require('../models/SurveyQuestion');
const UserPreference = require('../models/UserPreference');
const { calculateTargets } = require('../utils/calorie');
const { createGoalPlan, createWeightLog } = require('./nutrition.service');

const DIET_KEYS = ['diet', 'dietary_preferences'];
const ALLERGEN_KEYS = ['allergens'];
const GENDER_KEYS = ['gender'];
const WEIGHT_KEYS = ['weight', 'current_weight'];
const GOAL_WEIGHT_KEYS = ['goal_weight'];
const HEIGHT_KEYS = ['height'];
const AGE_KEYS = ['age'];
const ACTIVITY_KEYS = ['activity_level', 'activity'];
const GOAL_KEYS = ['goal_type'];
const GOAL_TIMELINE_KEYS = ['goal_timeline'];
const MEALS_PER_DAY_KEYS = ['meals_per_day'];
const HEALTH_CONDITION_KEYS = ['health_conditions'];
const FITNESS_LEVEL_KEYS = ['fitness_level'];
const WORKOUT_PREFERENCE_KEYS = ['workout_preference'];
const PHYSICAL_LIMITATION_KEYS = ['physical_limitations'];
const COOK_TIME_KEYS = ['cook_time'];

const FITNESS_TO_ACTIVITY = {
  beginner: 'light',
  intermediate: 'moderate',
  advanced: 'active',
  athlete: 'very_active',
};

function extractPreferenceFields(responses) {
  const fields = {};
  for (const { questionKey, answers } of responses) {
    const key = questionKey.toLowerCase();
    if (DIET_KEYS.some((k) => key.includes(k))) fields.dietaryPreferences = answers;
    if (ALLERGEN_KEYS.some((k) => key.includes(k))) fields.allergens = answers;
    if (GENDER_KEYS.some((k) => key === k)) fields.gender = answers[0];
    if (WEIGHT_KEYS.some((k) => key === k)) {
      const v = parseFloat(answers[0]);
      if (!isNaN(v)) fields.weightKg = v;
    }
    if (GOAL_WEIGHT_KEYS.some((k) => key === k)) {
      const v = parseFloat(answers[0]);
      if (!isNaN(v)) fields.goalWeightKg = v;
    }
    if (HEIGHT_KEYS.some((k) => key === k)) {
      const v = parseFloat(answers[0]);
      if (!isNaN(v)) fields.heightCm = v;
    }
    if (AGE_KEYS.some((k) => key === k)) {
      const v = parseInt(answers[0], 10);
      if (!isNaN(v)) fields.age = v;
    }
    if (ACTIVITY_KEYS.some((k) => key.includes(k))) fields.activityLevel = answers[0];
    if (GOAL_KEYS.some((k) => key === k)) fields.goalType = answers[0];
    if (GOAL_TIMELINE_KEYS.some((k) => key === k)) fields.goalTimeline = answers[0];
    if (MEALS_PER_DAY_KEYS.some((k) => key === k)) {
      const v = parseInt(answers[0], 10);
      if (!isNaN(v)) fields.mealsPerDay = v;
    }
    if (HEALTH_CONDITION_KEYS.some((k) => key === k)) fields.healthConditions = answers;
    if (FITNESS_LEVEL_KEYS.some((k) => key === k)) {
      fields.fitnessLevel = answers[0];
      // Derive activityLevel from fitnessLevel when no explicit activity question exists
      if (!fields.activityLevel && FITNESS_TO_ACTIVITY[answers[0]]) {
        fields.activityLevel = FITNESS_TO_ACTIVITY[answers[0]];
      }
    }
    if (WORKOUT_PREFERENCE_KEYS.some((k) => key === k)) fields.workoutPreferences = answers;
    if (PHYSICAL_LIMITATION_KEYS.some((k) => key === k)) fields.physicalLimitations = answers;
    if (COOK_TIME_KEYS.some((k) => key === k)) fields.cookTimePreference = answers[0];
  }

  // If fitnessLevel was set but activityLevel still not set (no explicit activity question)
  if (fields.fitnessLevel && !fields.activityLevel && FITNESS_TO_ACTIVITY[fields.fitnessLevel]) {
    fields.activityLevel = FITNESS_TO_ACTIVITY[fields.fitnessLevel];
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
    weightKg: extracted.weightKg,
    activityLevel: merged.activityLevel,
    goalType: merged.goalType,
    goalTimeline: merged.goalTimeline,
  });

  // Strip fields that now live in dedicated tables
  const { weightKg, goalWeightKg, ...prefFields } = extracted;

  const update = {
    ...prefFields,
    surveyResponses: responses,
    surveyCompletedAt: new Date(),
  };

  const preference = await UserPreference.findOneAndUpdate(
    { user: userId },
    { $set: update },
    { upsert: true, new: true }
  ).lean();

  if (weightKg != null) {
    await createWeightLog({ userId, data: { weightKg } });
  }

  if (targets) {
    await createGoalPlan({
      userId,
      data: {
        targetCalories: targets.calories,
        targetProteinG: targets.proteinG,
        targetCarbsG: targets.carbsG,
        targetFatG: targets.fatG,
        targetWaterMl: targets.waterMl,
        targetWeightKg: goalWeightKg ?? null,
      },
    });
  }

  return preference;
}

async function getPreferences(userId) {
  return UserPreference.findOne({ user: userId }).lean();
}

module.exports = { getQuestions, submitSurvey, getPreferences };
