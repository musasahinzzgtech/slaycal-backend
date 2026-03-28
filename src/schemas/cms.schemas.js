const { z } = require('zod');

const optionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

const surveyQuestionBaseSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['single', 'multiple', 'number', 'text']),
  titleI18n: z.record(z.string()).optional(),
  category: z.string().optional(),
  options: z.array(optionSchema).optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

function refineOptionsForChoiceType(data, ctx) {
  const t = data.type;
  if (t && ['single', 'multiple'].includes(t)) {
    if (!data.options || data.options.length === 0) {
      ctx.addIssue({
        path: ['options'],
        code: z.ZodIssueCode.custom,
        message: 'options must be a non-empty array for single/multiple type questions',
      });
    }
  }
}

const createSurveyQuestionSchema = surveyQuestionBaseSchema.superRefine(
  refineOptionsForChoiceType
);

// PATCH: all fields optional; options rule applies only when `type` is present and choice-based
const updateSurveyQuestionSchema = surveyQuestionBaseSchema
  .partial()
  .superRefine(refineOptionsForChoiceType);

module.exports = { createSurveyQuestionSchema, updateSurveyQuestionSchema };
