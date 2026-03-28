require('dotenv').config();
const mongoose = require('mongoose');
const SurveyQuestion = require('../src/models/SurveyQuestion');
const config = require('../src/config');

const questions = [
  {
    key: 'gender',
    title: 'What is your gender?',
    titleI18n: { tr: 'Cinsiyetiniz nedir?' },
    type: 'single',
    category: 'personal',
    options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'other', label: 'Other' },
    ],
    isRequired: true,
    displayOrder: 1,
  },
  {
    key: 'age',
    title: 'How old are you?',
    titleI18n: { tr: 'Kaç yaşındasınız?' },
    type: 'number',
    category: 'personal',
    options: [],
    isRequired: true,
    displayOrder: 2,
  },
  {
    key: 'height',
    title: 'What is your height? (cm)',
    titleI18n: { tr: 'Boyunuz nedir? (cm)' },
    type: 'number',
    category: 'personal',
    options: [],
    isRequired: true,
    displayOrder: 3,
  },
  {
    key: 'weight',
    title: 'What is your current weight? (kg)',
    titleI18n: { tr: 'Şu anki kilonuz nedir? (kg)' },
    type: 'number',
    category: 'personal',
    options: [],
    isRequired: true,
    displayOrder: 4,
  },
  {
    key: 'activity_level',
    title: 'How active are you?',
    titleI18n: { tr: 'Ne kadar aktifsiniz?' },
    type: 'single',
    category: 'lifestyle',
    options: [
      { value: 'sedentary', label: 'Sedentary (little or no exercise)' },
      { value: 'light', label: 'Light (exercise 1-3 days/week)' },
      { value: 'moderate', label: 'Moderate (exercise 3-5 days/week)' },
      { value: 'active', label: 'Active (exercise 6-7 days/week)' },
      { value: 'very_active', label: 'Very Active (hard exercise & physical job)' },
    ],
    isRequired: true,
    displayOrder: 5,
  },
  {
    key: 'goal_type',
    title: 'What is your main goal?',
    titleI18n: { tr: 'Ana hedefiniz nedir?' },
    type: 'single',
    category: 'goal',
    options: [
      { value: 'lose_weight', label: 'Lose Weight' },
      { value: 'maintain', label: 'Maintain Weight' },
      { value: 'gain_muscle', label: 'Gain Muscle' },
    ],
    isRequired: true,
    displayOrder: 6,
  },
  {
    key: 'dietary_preferences',
    title: 'Do you have any dietary preferences?',
    titleI18n: { tr: 'Beslenme tercihiniz var mı?' },
    type: 'multiple',
    category: 'diet',
    options: [
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'gluten-free', label: 'Gluten-Free' },
      { value: 'dairy-free', label: 'Dairy-Free' },
      { value: 'keto', label: 'Keto' },
      { value: 'paleo', label: 'Paleo' },
      { value: 'none', label: 'None' },
    ],
    isRequired: false,
    displayOrder: 7,
  },
  {
    key: 'allergens',
    title: 'Do you have any food allergies?',
    titleI18n: { tr: 'Gıda alerjiniz var mı?' },
    type: 'multiple',
    category: 'diet',
    options: [
      { value: 'nuts', label: 'Nuts' },
      { value: 'dairy', label: 'Dairy' },
      { value: 'eggs', label: 'Eggs' },
      { value: 'gluten', label: 'Gluten' },
      { value: 'shellfish', label: 'Shellfish' },
      { value: 'soy', label: 'Soy' },
      { value: 'none', label: 'None' },
    ],
    isRequired: false,
    displayOrder: 8,
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
