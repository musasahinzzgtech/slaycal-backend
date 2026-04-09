/**
 * OpenAPI 3 reusable component schemas (SlayCall API).
 */
module.exports = {
  ApiError: {
    type: 'object',
    required: ['error'],
    properties: {
      error: {
        type: 'object',
        required: ['message', 'code'],
        properties: {
          message: { type: 'string', example: 'Invalid credentials' },
          code: { type: 'string', example: 'INVALID_CREDENTIALS' },
        },
      },
    },
  },

  HealthResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'ok' },
      timestamp: { type: 'string', format: 'date-time' },
    },
  },

  AuthUser: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '507f1f77bcf86cd799439011' },
      email: { type: 'string', format: 'email', nullable: true },
      firstName: { type: 'string', nullable: true },
      locale: { type: 'string', nullable: true },
      userType: { type: 'string', enum: ['anonymous', 'registered'] },
    },
  },

  TokenPair: {
    type: 'object',
    properties: {
      accessToken: { type: 'string', description: 'JWT for Authorization: Bearer' },
      refreshToken: { type: 'string' },
      user: { $ref: '#/components/schemas/AuthUser' },
    },
  },

  AnonymousInitBody: {
    type: 'object',
    properties: {
      deviceId: { type: 'string', description: 'Stable device identifier' },
      platform: { type: 'string', example: 'ios' },
      appVersion: { type: 'string', example: '1.0.0' },
    },
  },

  AnonymousInitData: {
    type: 'object',
    properties: {
      anonymousToken: { type: 'string' },
      grantType: { type: 'string', example: 'anonymous' },
      credits: { type: 'integer', example: 0 },
      isNewUser: { type: 'boolean' },
      isNewDevice: { type: 'boolean' },
      user: { $ref: '#/components/schemas/AuthUser' },
    },
  },

  RegisterBody: {
    type: 'object',
    required: ['email', 'password', 'confirmPassword'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      confirmPassword: { type: 'string', description: 'Must match password' },
    },
  },

  LoginBody: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
    },
  },

  SurveyResponseItem: {
    type: 'object',
    required: ['questionKey', 'answers'],
    properties: {
      questionKey: { type: 'string' },
      answers: { type: 'array', items: { type: 'string' } },
    },
  },

  SurveySubmitBody: {
    type: 'object',
    required: ['responses'],
    properties: {
      responses: {
        type: 'array',
        items: { $ref: '#/components/schemas/SurveyResponseItem' },
      },
    },
  },

  SurveyQuestion: {
    type: 'object',
    properties: {
      key: { type: 'string' },
      title: { type: 'string' },
      type: { type: 'string' },
      category: { type: 'string' },
      options: { type: 'array', items: {} },
      isRequired: { type: 'boolean' },
      displayOrder: { type: 'integer' },
    },
  },

  PersonalDetailsBody: {
    type: 'object',
    properties: {
      currentWeight: { type: 'number' },
      goalWeight: { type: 'number' },
      height: { type: 'number' },
      gender: { type: 'string' },
      age: { type: 'integer' },
      activityLevel: { type: 'string' },
      goalType: { type: 'string' },
    },
  },

  Pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer', example: 1 },
      perPage: { type: 'integer', example: 20 },
      total: { type: 'integer' },
      totalPages: { type: 'integer' },
    },
  },

  Recipe: {
    type: 'object',
    description: 'Recipe document (full fields when returned from lean queries; `_id` is Mongo ObjectId)',
    additionalProperties: true,
    properties: {
      _id: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      ingredients: { type: 'array', items: { type: 'string' } },
      instructions: { type: 'array', items: { type: 'string' } },
      prepTimeMinutes: { type: 'number' },
      cookTimeMinutes: { type: 'number' },
      servings: { type: 'number' },
      imageUrl: { type: 'string', nullable: true },
      nutrition: {
        type: 'object',
        properties: {
          calories: { type: 'number' },
          protein: { type: 'number' },
          carbs: { type: 'number' },
          fat: { type: 'number' },
          fiber: { type: 'number' },
        },
      },
      dietaryTags: { type: 'array', items: { type: 'string' } },
      allergens: { type: 'array', items: { type: 'string' } },
      cuisineType: { type: 'string' },
      difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
      source: { type: 'string', enum: ['manual', 'ai_generated'] },
      isPublished: { type: 'boolean' },
      isTrending: { type: 'boolean' },
      category: { type: 'string' },
      createdBy: { type: 'string', description: 'User ObjectId when set' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  DiscoverRecipesBody: {
    type: 'object',
    required: ['ingredients'],
    properties: {
      ingredients: { type: 'array', items: { type: 'string' }, minItems: 1 },
      maxPrepTime: { type: 'number', description: 'Optional max prep time in minutes' },
      dietaryPreferences: { type: 'array', items: { type: 'string' } },
    },
  },

  AddFavoriteBody: {
    type: 'object',
    required: ['recipeId'],
    properties: {
      recipeId: { type: 'string' },
    },
  },

  RecognitionUploadResponse: {
    type: 'object',
    properties: {
      jobId: { type: 'string' },
      status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
    },
  },

  RecognitionJob: {
    type: 'object',
    properties: {
      jobId: { type: 'string' },
      status: { type: 'string' },
      detectionResults: { nullable: true },
      errorMessage: { type: 'string', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      completedAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },

  ScanUploadResponse: {
    type: 'object',
    properties: {
      scanId: { type: 'string' },
      status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
    },
  },

  FoodLogBody: {
    type: 'object',
    required: ['mealName', 'calories'],
    properties: {
      mealName: { type: 'string' },
      calories: { type: 'number' },
      proteinGrams: { type: 'number', default: 0 },
      carbsGrams: { type: 'number', default: 0 },
      fatGrams: { type: 'number', default: 0 },
      quantity: { type: 'number', default: 1 },
      mealType: {
        type: 'string',
        enum: ['breakfast', 'lunch', 'dinner', 'snack'],
        default: 'snack',
      },
      loggedAt: { type: 'string', description: 'ISO date string' },
    },
  },

  FoodLogPatchBody: {
    type: 'object',
    properties: {
      mealName: { type: 'string' },
      calories: { type: 'number' },
      proteinGrams: { type: 'number' },
      carbsGrams: { type: 'number' },
      fatGrams: { type: 'number' },
      quantity: { type: 'number' },
      mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
    },
  },

  WaterIntakeBody: {
    type: 'object',
    required: ['amountMl'],
    properties: {
      amountMl: { type: 'number', minimum: 0, exclusiveMinimum: true },
      loggedAt: { type: 'string' },
    },
  },

  WeightLogBody: {
    type: 'object',
    required: ['weightKg'],
    properties: {
      weightKg: { type: 'number', minimum: 0, exclusiveMinimum: true },
      note: { type: 'string' },
      loggedAt: { type: 'string' },
    },
  },

  GoalPlanBody: {
    type: 'object',
    properties: {
      targetWeightKg: { type: 'number' },
      targetCalories: { type: 'number' },
      targetProteinG: { type: 'number' },
      targetCarbsG: { type: 'number' },
      targetFatG: { type: 'number' },
      targetWaterMl: { type: 'number' },
    },
  },

  QuotaConfigPatchBody: {
    type: 'object',
    properties: {
      dailyLimit: { type: 'number' },
      isActive: { type: 'boolean' },
    },
  },

  SubscriptionTierBody: {
    type: 'object',
    required: ['tier'],
    properties: {
      tier: { type: 'string', enum: ['free', 'premium', 'trial'] },
    },
  },

  GrantTrialBody: {
    type: 'object',
    properties: {
      days: { type: 'integer', default: 7, description: 'Trial length in days' },
    },
  },

  CmsOption: {
    type: 'object',
    required: ['value', 'label'],
    properties: {
      value: { type: 'string' },
      label: { type: 'string' },
    },
  },

  CmsSurveyQuestionCreateBody: {
    type: 'object',
    required: ['key', 'title', 'type'],
    properties: {
      key: { type: 'string' },
      title: { type: 'string' },
      type: { type: 'string', enum: ['single', 'multiple', 'number', 'text'] },
      titleI18n: { type: 'object', additionalProperties: { type: 'string' } },
      category: { type: 'string' },
      options: { type: 'array', items: { $ref: '#/components/schemas/CmsOption' } },
      isRequired: { type: 'boolean' },
      isActive: { type: 'boolean' },
      displayOrder: { type: 'integer' },
    },
    description:
      'For `single` or `multiple` types, `options` must be a non-empty array.',
  },

  CmsSurveyQuestionPatchBody: {
    type: 'object',
    properties: {
      key: { type: 'string' },
      title: { type: 'string' },
      type: { type: 'string', enum: ['single', 'multiple', 'number', 'text'] },
      titleI18n: { type: 'object', additionalProperties: { type: 'string' } },
      category: { type: 'string' },
      options: { type: 'array', items: { $ref: '#/components/schemas/CmsOption' } },
      isRequired: { type: 'boolean' },
      isActive: { type: 'boolean' },
      displayOrder: { type: 'integer' },
    },
    description:
      'All optional. For `type` `single`/`multiple`, `options` must be non-empty when present.',
  },

  TranslationDoc: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      key: { type: 'string', example: 'home.title' },
      en: { type: 'string', example: 'Home' },
      tr: { type: 'string', example: 'Ana Sayfa' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  TranslationUpsertBody: {
    type: 'object',
    properties: {
      en: { type: 'string', example: 'Home' },
      tr: { type: 'string', example: 'Ana Sayfa' },
    },
  },

  TranslationBulkBody: {
    type: 'object',
    description: 'Pass one or both locale JSONs. Nested objects are flattened to dot-notation keys automatically. Existing keys are overwritten.',
    properties: {
      en: { type: 'object', additionalProperties: true, description: 'Full or partial English locale JSON' },
      tr: { type: 'object', additionalProperties: true, description: 'Full or partial Turkish locale JSON' },
    },
  },

  FcmTokenBody: {
    type: 'object',
    required: ['token'],
    properties: {
      token: { type: 'string', description: 'Firebase Cloud Messaging device token' },
    },
  },

  AdminRegisterBody: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
    },
  },

  CmsUserCreateBody: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      userType: { type: 'string', enum: ['anonymous', 'registered'], default: 'registered' },
      roles: { type: 'array', items: { type: 'string' }, example: ['admin'] },
    },
  },

  CmsUserPatchBody: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      userType: { type: 'string', enum: ['anonymous', 'registered'] },
      roles: { type: 'array', items: { type: 'string' } },
    },
  },

  NotificationSendBody: {
    type: 'object',
    required: ['title', 'body'],
    properties: {
      title: { type: 'string', example: 'New Recipe Available' },
      body: { type: 'string', example: 'Check out your personalized recipe for today!' },
      data: { type: 'object', additionalProperties: true, description: 'Optional custom data payload' },
      userIds: { type: 'array', items: { type: 'string' }, description: 'Target specific user IDs; omit to broadcast to all' },
    },
  },
};
