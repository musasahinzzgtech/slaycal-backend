/**
 * OpenAPI 3 paths for /api/v1 and /health.
 */
const errRef = (description) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ApiError' },
    },
  },
});

const bearer = [{ bearerAuth: [] }];

module.exports = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Liveness check',
      description: 'Returns service status and current server timestamp.',
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HealthResponse' },
            },
          },
        },
      },
    },
  },

  '/api/v1/auth/anonymous/init': {
    post: {
      tags: ['Auth'],
      summary: 'Initialize anonymous session',
      description:
        'Creates or reuses an anonymous user by `deviceId` and returns a JWT (`anonymousToken`) usable as Bearer token for protected routes.',
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AnonymousInitBody' },
          },
        },
      },
      responses: {
        201: {
          description: 'Anonymous session ready',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/AnonymousInitData' },
                },
              },
            },
          },
        },
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register with email and password',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RegisterBody' },
          },
        },
      },
      responses: {
        201: {
          description: 'User created; tokens issued',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/TokenPair' },
                },
              },
            },
          },
        },
        409: errRef('Email already registered (DUPLICATE_EMAIL)'),
        422: errRef('Validation error (e.g. passwords do not match)'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginBody' },
          },
        },
      },
      responses: {
        200: {
          description: 'Tokens issued',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/TokenPair' },
                },
              },
            },
          },
        },
        401: errRef('Invalid credentials'),
        422: errRef('Validation error'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout',
      description: 'Clears stored refresh token for the authenticated user.',
      security: bearer,
      responses: {
        200: {
          description: 'Logged out',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Logged out' },
                },
              },
            },
          },
        },
        401: errRef('Missing or invalid JWT'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/survey/questions': {
    get: {
      tags: ['Survey'],
      summary: 'List active survey questions',
      description:
        'Localized titles use `Accept-Language` (first tag, e.g. `en` from `en-US`). Defaults to `en`.',
      security: bearer,
      parameters: [
        {
          name: 'Accept-Language',
          in: 'header',
          required: false,
          schema: { type: 'string', example: 'en-US' },
        },
      ],
      responses: {
        200: {
          description: 'Question list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/SurveyQuestion' },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/survey/submit': {
    post: {
      tags: ['Survey'],
      summary: 'Submit survey answers',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SurveySubmitBody' },
          },
        },
      },
      responses: {
        200: {
          description: 'Derived preferences returned',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      preferences: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        422: errRef('Validation error'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/survey/preferences': {
    get: {
      tags: ['Survey'],
      summary: 'Get saved user preferences',
      security: bearer,
      responses: {
        200: {
          description: 'Preferences or null if none',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { nullable: true, type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/user/personal-details': {
    get: {
      tags: ['User'],
      summary: 'Get personal details',
      security: bearer,
      responses: {
        200: {
          description: 'Personal details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      personalDetails: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        500: errRef('Server error'),
      },
    },
    patch: {
      tags: ['User'],
      summary: 'Update personal details',
      security: bearer,
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PersonalDetailsBody' },
          },
        },
      },
      responses: {
        200: {
          description: 'Updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      personalDetails: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        422: errRef('Validation error'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/recipes': {
    get: {
      tags: ['Recipes'],
      summary: 'List published recipes',
      description: 'Public. Supports pagination and optional filters.',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'perPage', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        { name: 'title', in: 'query', schema: { type: 'string' } },
        { name: 'description', in: 'query', schema: { type: 'string' } },
        {
          name: 'isTrending',
          in: 'query',
          schema: { type: 'string', enum: ['true', 'false'] },
        },
      ],
      responses: {
        200: {
          description: 'Paginated recipes',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      recipes: { type: 'array', items: { $ref: '#/components/schemas/Recipe' } },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
          },
        },
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/recipes/discover': {
    post: {
      tags: ['Recipes'],
      summary: 'AI recipe discovery from ingredients',
      description: 'Generates recipes via OpenAI, persists them, and returns the saved documents.',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/DiscoverRecipesBody' },
          },
        },
      },
      responses: {
        200: {
          description: 'Generated recipes',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      recipes: { type: 'array', items: { $ref: '#/components/schemas/Recipe' } },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        422: errRef('Validation error'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/recipes/personalized': {
    get: {
      tags: ['Recipes'],
      summary: 'Personalized recipe feed',
      description: 'Uses saved survey preferences (diet, allergens) when available.',
      security: bearer,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'perPage', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'isTrending', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
      ],
      responses: {
        200: {
          description: 'Paginated recipes',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      recipes: { type: 'array', items: { $ref: '#/components/schemas/Recipe' } },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/recipes/favorites': {
    get: {
      tags: ['Favorites'],
      summary: 'List favorite recipes',
      security: bearer,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'perPage', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: {
          description: 'Paginated favorites',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      favorites: { type: 'array', items: { type: 'object', additionalProperties: true } },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        500: errRef('Server error'),
      },
    },
    post: {
      tags: ['Favorites'],
      summary: 'Add recipe to favorites',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AddFavoriteBody' },
          },
        },
      },
      responses: {
        201: {
          description: 'Favorite created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      favorite: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        422: errRef('Validation error'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/recipes/favorites/{recipeId}': {
    delete: {
      tags: ['Favorites'],
      summary: 'Remove favorite',
      security: bearer,
      parameters: [
        {
          name: 'recipeId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        204: { description: 'Removed' },
        401: errRef('Unauthorized'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/recognition/upload': {
    post: {
      tags: ['Recognition'],
      summary: 'Upload image for ingredient recognition',
      description:
        'Multipart field name must be `image`. Allowed types: JPEG, PNG, WebP. Max 10MB. Returns a job id; poll `GET /recognition/jobs/{jobId}` for results.',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['image'],
              properties: {
                image: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Job created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/RecognitionUploadResponse' },
                },
              },
            },
          },
        },
        400: errRef('No file or invalid type (NO_FILE, INVALID_FILE_TYPE, FILE_TOO_LARGE)'),
        401: errRef('Unauthorized'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/recognition/jobs/{jobId}': {
    get: {
      tags: ['Recognition'],
      summary: 'Get recognition job status and results',
      security: bearer,
      parameters: [
        { name: 'jobId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Job state',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/RecognitionJob' },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        403: errRef('Job belongs to another user'),
        404: errRef('Job not found'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/scan/upload': {
    post: {
      tags: ['Scan'],
      summary: 'Upload meal photo for nutrition scan',
      description:
        'Multipart field `image`. Same image rules as recognition. Progress/completion may be delivered over Socket.IO namespace `/scan` (room `scan:{scanId}`).',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['image'],
              properties: {
                image: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Scan started',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/ScanUploadResponse' },
                },
              },
            },
          },
        },
        400: errRef('No file or invalid type'),
        401: errRef('Unauthorized'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/nutrition/food-log': {
    get: {
      tags: ['Nutrition'],
      summary: 'List food log entries',
      security: bearer,
      parameters: [
        { name: 'startDate', in: 'query', schema: { type: 'string' } },
        { name: 'endDate', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Food log payload (shape from service)',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { type: 'object', additionalProperties: true } },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        500: errRef('Server error'),
      },
    },
    post: {
      tags: ['Nutrition'],
      summary: 'Create food log entry',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/FoodLogBody' },
          },
        },
      },
      responses: {
        201: {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      foodLog: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        422: errRef('Validation error'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/nutrition/food-log/{id}': {
    patch: {
      tags: ['Nutrition'],
      summary: 'Update food log entry',
      security: bearer,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/FoodLogPatchBody' },
          },
        },
      },
      responses: {
        200: {
          description: 'Updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      foodLog: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        404: errRef('Not found'),
        422: errRef('Validation error'),
        500: errRef('Server error'),
      },
    },
    delete: {
      tags: ['Nutrition'],
      summary: 'Delete food log entry',
      security: bearer,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        204: { description: 'Deleted' },
        401: errRef('Unauthorized'),
        404: errRef('Not found'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/nutrition/water-intake': {
    get: {
      tags: ['Nutrition'],
      summary: 'Get water intake for a day',
      security: bearer,
      parameters: [{ name: 'date', in: 'query', schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Water intake data',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { type: 'object', additionalProperties: true } },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        500: errRef('Server error'),
      },
    },
    post: {
      tags: ['Nutrition'],
      summary: 'Log water intake',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/WaterIntakeBody' },
          },
        },
      },
      responses: {
        201: {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      waterIntake: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        422: errRef('Validation error'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/nutrition/water-intake/{id}': {
    delete: {
      tags: ['Nutrition'],
      summary: 'Delete water intake entry',
      security: bearer,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        204: { description: 'Deleted' },
        401: errRef('Unauthorized'),
        404: errRef('Not found'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/nutrition/progress': {
    get: {
      tags: ['Nutrition'],
      summary: 'Nutrition progress summary',
      security: bearer,
      parameters: [
        { name: 'startDate', in: 'query', schema: { type: 'string' } },
        { name: 'endDate', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Progress aggregates',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { type: 'object', additionalProperties: true } },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/nutrition/weight-log': {
    post: {
      tags: ['Nutrition'],
      summary: 'Log body weight',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/WeightLogBody' },
          },
        },
      },
      responses: {
        201: {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      weightLog: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        422: errRef('Validation error'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/nutrition/goal-plans/active': {
    get: {
      tags: ['Nutrition'],
      summary: 'Get active goal plan',
      security: bearer,
      responses: {
        200: {
          description: 'Active plan or null',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { nullable: true, type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/nutrition/goal-plans': {
    post: {
      tags: ['Nutrition'],
      summary: 'Create goal plan',
      security: bearer,
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/GoalPlanBody' },
          },
        },
      },
      responses: {
        201: {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      goalPlan: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        422: errRef('Validation error'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/admin/quota/configs': {
    get: {
      tags: ['Admin'],
      summary: 'List quota configurations',
      description: 'Requires JWT with **admin** role (`roles` claim includes `admin`).',
      security: bearer,
      responses: {
        200: {
          description: 'Array of quota configs',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      configs: { type: 'array', items: { type: 'object', additionalProperties: true } },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        403: errRef('Forbidden (not admin)'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/admin/quota/configs/{id}': {
    patch: {
      tags: ['Admin'],
      summary: 'Update quota config by MongoDB id',
      security: bearer,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/QuotaConfigPatchBody' },
          },
        },
      },
      responses: {
        200: {
          description: 'Updated config',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      quotaConfig: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        403: errRef('Forbidden'),
        404: errRef('Quota config not found'),
        422: errRef('Validation error'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/admin/subscriptions': {
    get: {
      tags: ['Admin'],
      summary: 'List subscriptions (paginated)',
      security: bearer,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        {
          name: 'tier',
          in: 'query',
          schema: { type: 'string', enum: ['free', 'premium', 'trial'] },
        },
      ],
      responses: {
        200: {
          description: 'Subscriptions and pagination',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      subscriptions: {
                        type: 'array',
                        items: { type: 'object', additionalProperties: true },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        403: errRef('Forbidden'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/admin/subscriptions/{userId}/tier': {
    patch: {
      tags: ['Admin'],
      summary: 'Update user subscription tier',
      security: bearer,
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SubscriptionTierBody' },
          },
        },
      },
      responses: {
        200: {
          description: 'Updated subscription',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      subscription: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        403: errRef('Forbidden'),
        404: errRef('Subscription not found'),
        422: errRef('Validation error'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/admin/subscriptions/{userId}/trial': {
    post: {
      tags: ['Admin'],
      summary: 'Grant trial period',
      description: 'Optional body `{ "days": number }` (default **7** in service).',
      security: bearer,
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/GrantTrialBody' },
          },
        },
      },
      responses: {
        200: {
          description: 'Subscription updated to trial',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      subscription: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
          },
        },
        401: errRef('Unauthorized'),
        403: errRef('Forbidden'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/cms/survey-questions': {
    get: {
      tags: ['CMS'],
      summary: 'List all survey questions (including inactive)',
      description:
        '**Warning:** Route is currently **not** protected by JWT in code — lock down before production.',
      security: [],
      responses: {
        200: {
          description: 'Array of question documents',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'object', additionalProperties: true } },
                },
              },
            },
          },
        },
        500: errRef('Server error'),
      },
    },
    post: {
      tags: ['CMS'],
      summary: 'Create survey question',
      description: 'Unauthenticated in current implementation — secure before production.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CmsSurveyQuestionCreateBody' },
          },
        },
      },
      responses: {
        201: {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        422: errRef('Validation error'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/cms/survey-questions/{id}': {
    patch: {
      tags: ['CMS'],
      summary: 'Update survey question',
      security: [],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CmsSurveyQuestionPatchBody' },
          },
        },
      },
      responses: {
        200: {
          description: 'Updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        404: errRef('Not found'),
        422: errRef('Validation error'),
        500: errRef('Server error'),
      },
    },
    delete: {
      tags: ['CMS'],
      summary: 'Delete survey question',
      security: [],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        204: { description: 'Deleted' },
        404: errRef('Not found'),
        500: errRef('Server error'),
      },
    },
  },

  '/api/v1/cms/users': {
    get: {
      tags: ['CMS'],
      summary: 'List users (safe fields)',
      description:
        'Response shape: `{ data: User[], pagination }` (pagination at top level). Unauthenticated in current code.',
      security: [],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
      ],
      responses: {
        200: {
          description: 'Users and pagination',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'object', additionalProperties: true } },
                  pagination: { $ref: '#/components/schemas/Pagination' },
                },
              },
            },
          },
        },
        500: errRef('Server error'),
      },
    },
  },
};
