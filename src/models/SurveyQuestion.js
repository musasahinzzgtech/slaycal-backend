const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    value: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false }
);

const surveyQuestionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleI18n: { type: Map, of: String, default: {} },
    type: { type: String, enum: ['single', 'multiple', 'number', 'text'], required: true },
    category: { type: String },
    options: [optionSchema],
    isRequired: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SurveyQuestion', surveyQuestionSchema);
