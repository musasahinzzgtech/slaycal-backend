const swaggerUi = require('swagger-ui-express');
const config = require('../config');
const schemas = require('./schemas');
const paths = require('./paths');

const TAGS = [
  { name: 'Health', description: 'Service availability.' },
  {
    name: 'Auth',
    description:
      'Registration, login, and anonymous device sessions. Send `Authorization: Bearer <token>` on protected routes (anonymous or registered JWT).',
  },
  { name: 'Survey', description: 'Onboarding questions and stored preferences.' },
  { name: 'User', description: 'Profile and personal details.' },
  { name: 'Recipes', description: 'Catalog, AI discovery, and personalized lists.' },
  { name: 'Favorites', description: 'Saved recipes under `/api/v1/recipes/favorites`.' },
  {
    name: 'Recognition',
    description: 'Ingredient recognition from uploaded images (async jobs).',
  },
  {
    name: 'Scan',
    description: 'Meal photo analysis; real-time updates via Socket.IO `/scan` namespace.',
  },
  { name: 'Nutrition', description: 'Food log, water, weight, progress, and goal plans.' },
  {
    name: 'Admin',
    description:
      'Operations tooling. Requires JWT whose payload includes `roles` with `admin`.',
  },
  {
    name: 'CMS',
    description:
      'Content and user listing helpers. **Currently unsecured in code** — add `auth` + `adminAuth` before production.',
  },
];

function buildOpenApiDocument() {
  const serverUrl =
    process.env.SWAGGER_SERVER_URL || `http://127.0.0.1:${config.port}`;

  return {
    openapi: '3.0.3',
    info: {
      title: 'SlayCall API',
      version: '1.0.0',
      description: [
        'REST API for the SlayCall app (Express, MongoDB, Firebase Storage, OpenAI).',
        '',
        '**Base path:** all versioned routes are under `/api/v1`.',
        '',
        '**Errors:** JSON shape `{ "error": { "message": string, "code": string } }` unless otherwise noted.',
        '',
        '**Auth:** use the value from `accessToken`, `refreshToken` response fields, or `anonymousToken` from anonymous init, as `Bearer` token.',
      ].join('\n'),
      contact: { name: 'SlayCall Backend' },
    },
    servers: [
      {
        url: serverUrl,
        description:
          process.env.SWAGGER_SERVER_URL
            ? 'Configured via SWAGGER_SERVER_URL'
            : 'Local (set SWAGGER_SERVER_URL for staging/production)',
      },
    ],
    tags: TAGS,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT from login, register, or anonymous init.',
        },
      },
      schemas,
    },
    paths,
  };
}

function mountSwagger(app) {
  const spec = buildOpenApiDocument();

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'SlayCall API',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
        showRequestDuration: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
      },
    })
  );

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(spec);
  });
}

module.exports = { mountSwagger, buildOpenApiDocument };
