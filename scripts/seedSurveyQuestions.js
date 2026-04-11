require('dotenv').config();
const mongoose = require('mongoose');
const SurveyQuestion = require('../src/models/SurveyQuestion');
const config = require('../src/config');

const questions = [
  {
    key: 'gender',
    title: 'question_gender',
    titleI18n: {},
    type: 'single',
    category: 'personal',
    options: [
      { value: 'male', label: 'option_male' },
      { value: 'female', label: 'option_female' },
    ],
    isRequired: false,
    displayOrder: 1,
  },
  {
    key: 'age',
    title: 'question_age',
    titleI18n: {},
    type: 'number',
    category: 'personal',
    options: [],
    isRequired: true,
    displayOrder: 2,
  },
  {
    key: 'height',
    title: 'question_height',
    titleI18n: {},
    type: 'number',
    category: 'personal',
    options: [],
    isRequired: false,
    displayOrder: 3,
  },
  {
    key: 'weight',
    title: 'question_weight',
    titleI18n: {},
    type: 'number',
    category: 'personal',
    options: [],
    isRequired: true,
    displayOrder: 4,
  },
  {
    key: 'goal_type',
    title: 'question_goal_type',
    titleI18n: {},
    type: 'single',
    category: 'goal',
    options: [
      { value: 'lose_weight', label: 'option_lose_weight' },
      { value: 'maintain', label: 'option_maintain' },
      { value: 'gain_muscle', label: 'option_gain_muscle' },
    ],
    isRequired: false,
    displayOrder: 5,
  },
  {
    key: 'goal_weight',
    title: 'question_goal_weight',
    titleI18n: {},
    type: 'number',
    category: 'goal',
    options: [],
    isRequired: true,
    displayOrder: 6,
  },
  {
    key: 'goal_timeline',
    title: 'question_goal_timeline',
    titleI18n: {},
    type: 'single',
    category: 'goal',
    options: [
      { value: 'relaxed', label: 'option_relaxed' },
      { value: 'moderate', label: 'option_moderate' },
      { value: 'aggressive', label: 'option_aggressive' },
    ],
    isRequired: true,
    displayOrder: 7,
  },
  {
    key: 'cook_time',
    title: 'question_cook_time',
    titleI18n: {},
    type: 'single',
    category: 'goal',
    options: [
      { value: '15', label: 'option_under_fifteen' },
      { value: '60', label: 'option_fifteen_thirty' },
      { value: '120', label: 'option_over_an_hour' },
    ],
    isRequired: false,
    displayOrder: 8,
  },
  {
    key: 'meals_per_day',
    title: 'question_meals_per_day',
    titleI18n: {},
    type: 'single',
    category: 'lifestyle',
    options: [
      { value: '2', label: 'option_two_meals' },
      { value: '3', label: 'option_three_meals' },
      { value: '4', label: 'option_four_meals' },
      { value: '5', label: 'option_five_meals' },
      { value: '6', label: 'option_six_meals' },
    ],
    isRequired: true,
    displayOrder: 9,
  },
  {
    key: 'health_conditions',
    title: 'question_health_conditions',
    titleI18n: {},
    type: 'multiple',
    category: 'health',
    options: [
      { value: 'diabetes_type1', label: 'option_diabetes_type1' },
      { value: 'diabetes_type2', label: 'option_diabetes_type2' },
      { value: 'hypertension', label: 'option_hypertension' },
      { value: 'high_cholesterol', label: 'option_high_cholesterol' },
      { value: 'heart_disease', label: 'option_heart_disease' },
      { value: 'pcos', label: 'option_pcos' },
      { value: 'hypothyroid', label: 'option_hypothyroid' },
      { value: 'hyperthyroid', label: 'option_hyperthyroid' },
      { value: 'ibs', label: 'option_ibs' },
      { value: 'celiac', label: 'option_celiac' },
      { value: 'anemia', label: 'option_anemia' },
      { value: 'eating_disorder', label: 'option_eating_disorder' },
      { value: 'none', label: 'option_none' },
    ],
    isRequired: true,
    displayOrder: 10,
  },
  {
    key: 'fitness_level',
    title: 'question_fitness_level',
    titleI18n: {},
    type: 'single',
    category: 'fitness',
    options: [
      { value: 'beginner', label: 'option_fitness_level_beginner' },
      { value: 'intermediate', label: 'option_fitness_level_intermediate' },
      { value: 'advanced', label: 'option_fitness_level_advanced' },
      { value: 'athlete', label: 'option_fitness_level_athlete' },
    ],
    isRequired: false,
    displayOrder: 11,
  },
  {
    key: 'workout_preference',
    title: 'question_workout_preference',
    titleI18n: {},
    type: 'multiple',
    category: 'fitness',
    options: [
      { value: 'weight_training', label: 'option_weight_training' },
      { value: 'bodyweight', label: 'option_bodyweight' },
      { value: 'running', label: 'option_running' },
      { value: 'walking', label: 'option_walking' },
      { value: 'cycling', label: 'option_cycling' },
      { value: 'swimming', label: 'option_swimming' },
      { value: 'yoga', label: 'option_yoga' },
      { value: 'hiit', label: 'option_hiit' },
      { value: 'martial_arts', label: 'option_martial_arts' },
      { value: 'dance', label: 'option_dance' },
      { value: 'team_sports', label: 'option_team_sports' },
      { value: 'outdoor', label: 'option_outdoor' },
      { value: 'no_preference', label: 'option_no_preference' },
    ],
    isRequired: false,
    displayOrder: 12,
  },
  {
    key: 'physical_limitations',
    title: 'question_physical_limitations',
    titleI18n: {},
    type: 'multiple',
    category: 'fitness',
    options: [
      { value: 'lower_back', label: 'option_lower_back' },
      { value: 'knee', label: 'option_knee_injury' },
      { value: 'shoulder', label: 'option_shoulder_injury' },
      { value: 'wrist', label: 'option_wrist_injury' },
      { value: 'ankle', label: 'option_ankle_injury' },
      { value: 'hip', label: 'option_hip_injury' },
      { value: 'neck', label: 'option_neck_injury' },
      { value: 'pregnancy', label: 'option_pregnancy' },
      { value: 'mobility', label: 'option_mobility' },
      { value: 'none', label: 'option_none' },
    ],
    isRequired: false,
    displayOrder: 13,
  },
];

async function seed() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('[MongoDB] Connected');

    for (const q of questions) {
      await SurveyQuestion.findOneAndUpdate({ key: q.key }, q, { upsert: true, new: true });
      console.log(`[Seed] Upserted question: ${q.key}`);
    }

    console.log('[Seed] Survey questions seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error:', err.message);
    process.exit(1);
  }
}

seed();
