# SlayCall Express Backend — Detailed Analysis

> **Generated:** 2026-04-11 · **Last updated:** 2026-04-11 (Redis quota refactor + Docker)
> **Runtime:** Bun / Node ≥ 18  
> **Framework:** Express 4.x · MongoDB (Mongoose 8.x) · Socket.IO 4.x · Redis (ioredis 5.x)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Environment & Configuration](#3-environment--configuration)
4. [Entry Point & Bootstrap](#4-entry-point--bootstrap)
5. [Routes — Complete API Reference](#5-routes--complete-api-reference)
6. [Controllers](#6-controllers)
7. [Services](#7-services)
8. [Models / Database Schemas](#8-models--database-schemas)
9. [Middleware](#9-middleware)
10. [Socket.IO Real-Time Layer](#10-socketio-real-time-layer)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [External Integrations](#12-external-integrations)
13. [Validation & Error Handling](#13-validation--error-handling)
14. [Quota / Rate Limiting](#14-quota--rate-limiting)
15. [Calorie & Macro Calculator](#15-calorie--macro-calculator)
16. [i18n / Translations](#16-i18n--translations)
17. [API Documentation (Swagger)](#17-api-documentation-swagger)
18. [Database Indexes](#18-database-indexes)
19. [Seed Scripts](#19-seed-scripts)
20. [Docker & Deployment](#20-docker--deployment)
21. [Security Notes & Recommendations](#21-security-notes--recommendations)

---

## 1. Project Overview

SlayCall is a **nutrition & fitness tracking** mobile-app backend. It exposes a REST API (versioned at `/api/v1`) plus real-time Socket.IO namespaces for async AI operations.

**Core capabilities:**

| Domain | Summary |
|--------|---------|
| Auth | Anonymous device sessions + email/password registration, JWT tokens |
| Survey / Onboarding | Personalised questionnaire → auto-calculates macro targets |
| Recipes | Browsing, personalisation, and AI-generated recipe discovery |
| Meal Scan | Upload food photo → GPT-4o-mini estimates full nutrition |
| Ingredient Recognition | Upload photo → GPT-4o-mini identifies ingredients with confidence |
| Nutrition Tracking | Food log, water intake, weight log, goal plans, progress dashboard |
| Admin | Quota management, subscription tier overrides, trial grants |
| CMS | Headless content operations for recipes, users, survey questions |
| Notifications | Firebase Cloud Messaging (FCM) push notifications |
| i18n | Translations stored in MongoDB, served by locale |

---

## 2. Directory Structure

```
express-backend/
├── server.js                      # HTTP server + Socket.IO bootstrap
├── package.json
├── bun.lock
├── Dockerfile                     # Bun multi-stage production image
├── docker-compose.yml             # app + mongo + redis
├── .dockerignore
├── .env.example
├── scripts/
│   └── seedSurveyQuestions.js     # One-off DB seeder
└── src/
    ├── app.js                     # Express app wiring
    ├── config/
    │   └── index.js               # Centralised env config
    ├── middleware/
    │   ├── auth.js                # JWT verification
    │   ├── adminAuth.js           # Admin role guard
    │   ├── errorHandler.js        # Global error handler
    │   ├── validate.js            # Zod request validation
    │   └── upload.js              # Multer (memory, 10 MB limit)
    ├── models/
    │   ├── User.js
    │   ├── UserPreference.js
    │   ├── Subscription.js
    │   ├── Recipe.js
    │   ├── Favorite.js
    │   ├── FoodLogEntry.js
    │   ├── WaterIntake.js
    │   ├── WeightLog.js
    │   ├── GoalPlan.js
    │   ├── ScanResult.js
    │   ├── ImageJob.js
    │   ├── SurveyQuestion.js
    │   ├── Translation.js
    │   ├── Ingredient.js
    │   └── QuotaConfig.js
    ├── routes/
    │   ├── auth.routes.js
    │   ├── user.routes.js
    │   ├── survey.routes.js
    │   ├── recipe.routes.js
    │   ├── favorite.routes.js
    │   ├── scan.routes.js
    │   ├── recognition.routes.js
    │   ├── nutrition.routes.js
    │   ├── admin.routes.js
    │   ├── cms.routes.js
    │   └── translations.routes.js
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── user.controller.js
    │   ├── survey.controller.js
    │   ├── recipe.controller.js
    │   ├── favorite.controller.js
    │   ├── scan.controller.js
    │   ├── recognition.controller.js
    │   ├── nutrition.controller.js
    │   ├── admin.controller.js
    │   ├── cms.controller.js
    │   └── translation.controller.js
    ├── services/
    │   ├── auth.service.js
    │   ├── survey.service.js
    │   ├── recipe.service.js
    │   ├── favorite.service.js
    │   ├── scan.service.js
    │   ├── recognition.service.js
    │   ├── nutrition.service.js
    │   ├── admin.service.js
    │   ├── cms.service.js
    │   ├── openai.service.js
    │   ├── firebase.js
    │   ├── redis.js               # ioredis singleton client
    │   ├── storage.service.js
    │   ├── notification.service.js
    │   ├── translation.service.js
    │   └── quota.service.js       # Redis-backed, tier-aware daily counters
    ├── socket/
    │   ├── scan.socket.js
    │   ├── recognition.socket.js
    │   └── recipes.socket.js
    ├── schemas/
    │   └── cms.schemas.js         # Zod schemas for CMS routes
    ├── swagger/
    │   ├── index.js
    │   ├── paths.js
    │   └── schemas.js
    └── utils/
        ├── ApiError.js            # Custom HTTP error class
        └── calorie.js             # Harris-Benedict calculator
```

---

## 3. Environment & Configuration

All configuration lives in `src/config/index.js` and reads from environment variables.

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3000` | HTTP listen port |
| `MONGODB_URI` | — **(required)** | MongoDB connection string |
| `JWT_SECRET` | `change-me` | HMAC-SHA256 signing secret |
| `JWT_ACCESS_EXPIRATION` | `7d` | Access token lifetime |
| `JWT_REFRESH_EXPIRATION` | `30d` | Refresh token lifetime |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `FIREBASE_PROJECT_ID` | — | Firebase project |
| `FIREBASE_PRIVATE_KEY` | — | Service account private key (with `\n`) |
| `FIREBASE_CLIENT_EMAIL` | — | Service account email |
| `FIREBASE_STORAGE_BUCKET` | — | GCS bucket for uploads |
| `CORS_ORIGINS` | `http://localhost:8081` | Comma-separated allowed origins |
| `REDIS_URL` | `redis://localhost:6379` | ioredis connection string (use `rediss://` for TLS) |
| `SWAGGER_SERVER_URL` | `http://127.0.0.1:{PORT}` | Swagger base URL |

---

## 4. Entry Point & Bootstrap

### `server.js`

1. Loads `.env` via `dotenv`
2. Creates `http.Server` wrapping the Express `app`
3. Attaches `Socket.IO` with CORS `origin: true`
4. Registers three Socket.IO namespaces: `/scan`, `/recognition`, `/recipes`
5. Injects the `io` instance into `scanService`, `recognitionService`, `recipeService`
6. Connects Mongoose to `config.mongoUri`
7. Connects Redis via `redis.connect()` (verifies with PING)
8. Listens on `config.port`
9. Registers `SIGTERM` **and** `SIGINT` handlers for graceful shutdown — both disconnect Redis and Mongoose cleanly before exit

### `src/app.js`

Configures the Express app:
- `cors` with origins from config
- `express.json()`
- Mounts all route files under `/api/v1`
- Mounts Swagger UI at `/api-docs`
- Attaches the global error handler last

---

## 5. Routes — Complete API Reference

### Base path: `/api/v1`

Legend: **[auth]** = requires JWT · **[admin]** = requires admin role · **[file]** = multipart/form-data upload

---

### Auth — `/auth`

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| `POST` | `/anonymous/init` | — | Create anonymous session from device ID |
| `POST` | `/register` | validate | Register email/password account |
| `POST` | `/admin/register` | auth, admin, validate | Register an admin account |
| `POST` | `/login` | validate | Authenticate, receive tokens |
| `POST` | `/logout` | auth | Invalidate refresh token |

---

### User — `/user`

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| `POST` | `/fcm-token` | auth | Register FCM push token + platform |

---

### Survey — `/survey`

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| `GET` | `/questions` | auth | Get active questions (locale-aware) |
| `POST` | `/submit` | auth, validate | Submit responses → derive preferences & macro goals |
| `GET` | `/preferences` | auth | Retrieve saved preferences |

---

### Recipes — `/recipes`

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| `GET` | `/` | — | Paginated recipe browser (search, filter, trending) |
| `GET` | `/ai` | auth | List AI-generated recipes by current user |
| `POST` | `/discover` | auth, validate | Start async AI recipe generation — returns `requestId` |
| `GET` | `/personalized` | auth | Recipes matching user dietary profile |

---

### Favorites — `/recipes/favorites`

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| `GET` | `/` | auth | Paginated list of favorited recipes |
| `POST` | `/` | auth, validate | Add recipe to favorites (upsert) |
| `DELETE` | `/:recipeId` | auth | Remove from favorites |

---

### Recognition — `/recognition`

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| `POST` | `/upload` | auth, [file] | Upload image → async ingredient recognition, returns `jobId` |
| `GET` | `/jobs/:jobId` | auth | Poll job status and results |

---

### Scan — `/scan`

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| `POST` | `/upload` | auth, [file] | Upload meal photo → async nutrition analysis, returns `scanId` |

---

### Nutrition — `/nutrition`

#### Food Log

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| `GET` | `/food-log` | auth | Date-range query with daily & overall summaries |
| `POST` | `/food-log` | auth, validate | Log a meal |
| `PATCH` | `/food-log/:id` | auth, validate | Edit a meal entry |
| `DELETE` | `/food-log/:id` | auth | Remove a meal entry |

#### Water Intake

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| `GET` | `/water-intake` | auth | Water logs with progress % vs. goal |
| `POST` | `/water-intake` | auth, validate | Log water |
| `DELETE` | `/water-intake/:id` | auth | Remove water log |

#### Weight

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| `POST` | `/weight-log` | auth, validate | Log body weight |

#### Progress

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| `GET` | `/progress` | auth | Aggregated calorie / water / weight trends + BMI |

#### Goal Plans

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| `GET` | `/goal-plans/active` | auth | Fetch current active nutrition plan |
| `POST` | `/goal-plans` | auth, validate | Create/update goal plan (deactivates same-day plan) |

---

### Admin — `/admin` *(auth + adminAuth)*

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/quota/configs` | Merged view of code defaults + DB overrides for every (feature, tier) pair |
| `PUT` | `/quota/configs/:feature/:tier` | Create or replace the daily-limit override for a specific (feature, tier) |
| `DELETE` | `/quota/configs/:feature/:tier` | Remove the DB override; pair reverts to code default |
| `GET` | `/quota/usage/:userId` | Today's Redis usage counters for a user across all features |
| `GET` | `/subscriptions` | Paginated subscriptions (tier filter) |
| `PATCH` | `/subscriptions/:userId/tier` | Change subscription tier |
| `POST` | `/subscriptions/:userId/trial` | Grant trial period (default 7 days) |

---

### CMS — `/cms` ⚠️ *Currently unauthenticated — see §20*

#### Survey Questions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/survey-questions` | List all questions |
| `POST` | `/survey-questions` | Create question |
| `PATCH` | `/survey-questions/:id` | Update question |
| `DELETE` | `/survey-questions/:id` | Delete question |

#### Translations

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/translations` | List all translation entries |
| `POST` | `/translations/bulk` | Bulk upsert from nested locale JSON |
| `GET` | `/translations/:key` | Get single translation by key |
| `PUT` | `/translations/:key` | Upsert translation |
| `DELETE` | `/translations/:key` | Delete translation |

#### Users

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users` | Paginated user list |
| `POST` | `/users` | Create user |
| `PATCH` | `/users/:id` | Update user |
| `DELETE` | `/users/:id` | Delete user |

#### Recipes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/recipes` | Paginated recipe list |
| `POST` | `/recipes` | Create recipe (optional image upload) |
| `PATCH` | `/recipes/:id` | Update recipe (optional image) |
| `DELETE` | `/recipes/:id` | Delete recipe |

#### Notifications

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/notifications/send` | Send FCM notification to a user |

---

### Translations (Public) — `/translations`

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| `GET` | `/` | — | Nested locale object from `Accept-Language` header |

---

## 6. Controllers

Controllers are thin — they parse/validate request params, delegate to services, and send the response.

| Controller | Functions |
|-----------|-----------|
| `auth.controller` | `initAnonymous`, `register`, `registerAdmin`, `login`, `logout` |
| `user.controller` | `registerFcmToken` |
| `survey.controller` | `getQuestions`, `submitSurvey`, `getPreferences` |
| `recipe.controller` | `getRecipes`, `discoverRecipes`, `getRecipesAI`, `getPersonalizedRecipes` |
| `favorite.controller` | `getFavorites`, `addFavorite`, `removeFavorite` |
| `scan.controller` | `uploadScan` |
| `recognition.controller` | `uploadImage`, `getJob` |
| `nutrition.controller` | `getFoodLog`, `createFoodLog`, `updateFoodLog`, `deleteFoodLog`, `getWaterIntake`, `createWaterIntake`, `deleteWaterIntake`, `getProgress`, `createWeightLog`, `getActiveGoalPlan`, `createGoalPlan` |
| `admin.controller` | `getQuotaConfigs`, `upsertQuotaConfig`, `deleteQuotaConfig`, `getUserQuotaUsage`, `getSubscriptions`, `updateSubscriptionTier`, `grantTrial` |
| `cms.controller` | `listSurveyQuestions`, `createSurveyQuestion`, `updateSurveyQuestion`, `deleteSurveyQuestion`, `listUsers`, `createUser`, `updateUser`, `deleteUser`, `listRecipes`, `createRecipe`, `updateRecipe`, `deleteRecipe`, `sendNotification` |
| `translation.controller` | `listTranslations`, `getTranslation`, `upsertTranslation`, `deleteTranslation`, `getLocaleTranslations`, `bulkUpsertTranslations` |

---

## 7. Services

Business logic lives entirely in services. Controllers never touch the database directly.

### `auth.service`

| Function | Description |
|----------|-------------|
| `signTokens(user)` | Issues access (7d) + refresh (30d) JWT tokens |
| `initAnonymous({ deviceId, platform, appVersion })` | Create anonymous user + free subscription |
| `register({ email, password })` | Hash password (bcryptjs), create user + free subscription |
| `login({ email, password })` | Verify password, issue tokens, store refresh token |
| `registerAdmin({ email, password })` | Create user with `roles: ['admin']` |
| `logout(userId)` | Set `refreshToken: null` on user |

---

### `survey.service`

| Function | Description |
|----------|-------------|
| `getQuestions(locale)` | Active questions with locale-aware label translation |
| `submitSurvey(userId, responses)` | Map responses to preference fields, call `calculateTargets()`, create initial WeightLog and GoalPlan |
| `getPreferences(userId)` | Return UserPreference document |

**Mapping logic:** survey response keys like `diet`, `allergens`, `fitness_level` map to `dietaryPreferences`, `allergens`, `fitnessLevel` etc. Activity level is derived from fitness level if not provided.

---

### `recipe.service`

| Function | Description |
|----------|-------------|
| `getRecipes(opts)` | Paginated published recipes, optional text search or trending filter |
| `startDiscoverRecipes(opts)` | Generate `requestId`, run async OpenAI call, emit Socket.IO events |
| `getPersonalizedRecipes(opts)` | Filter by `dietaryTags` matching user prefs, excluding allergens |
| `getRecipesAI(opts)` | `source: 'ai_generated'` recipes created by user |
| `setIo(io)` | Inject Socket.IO instance (called from server.js) |

---

### `scan.service`

| Function | Description |
|----------|-------------|
| `uploadScan({ userId, file })` | Quota check, upload to Firebase Storage, create `ScanResult` (pending), fire-and-forget `processScan()` |
| `processScan(scanId)` | Set status `processing`, call `openai.analyzeFoodImage()`, save nutrition + food name, create `FoodLogEntry`, set `completed`, emit Socket.IO `scan:completed` |
| `setIo(io)` | Inject Socket.IO instance |

**Socket events emitted:** `scan:progress`, `scan:completed`, `scan:error` → room `scan:${scanId}`

---

### `recognition.service`

| Function | Description |
|----------|-------------|
| `uploadImage({ userId, file, language })` | Quota check, upload to Firebase Storage, create `ImageJob` (pending), fire-and-forget `processImage()` |
| `getJob({ userId, jobId })` | Fetch job; 403 if ownership mismatch |
| `processImage(jobId)` | Call `openai.recognizeIngredients()`, save `detectionResults`, emit Socket.IO events |
| `setIo(io)` | Inject Socket.IO instance |

**Socket events emitted:** `recognition:progress`, `recognition:completed`, `recognition:error` → room `recognition:${jobId}`

---

### `nutrition.service`

| Function | Description |
|----------|-------------|
| `getFoodLog({ userId, startDate, endDate })` | Entries grouped by date, daily summaries (cal, protein, carbs, fat), overall totals |
| `createFoodLog` | Insert FoodLogEntry |
| `updateFoodLog` | Update + ownership check |
| `deleteFoodLog` | Delete + ownership check |
| `getWaterIntake` | Logs with progress % vs. GoalPlan target |
| `createWaterIntake` | Insert WaterIntake |
| `deleteWaterIntake` | Delete + ownership check |
| `getProgress` | Aggregated daily calorie/water/weight breakdown, BMI, comparison to targets |
| `createWeightLog` | Insert WeightLog |
| `getActiveGoalPlan` | Current `isActive: true` plan |
| `createGoalPlan` | Deactivate same-day plans, insert new plan |

---

### `openai.service`

| Function | Model | Description |
|----------|-------|-------------|
| `generateRecipes(ingredients, maxPrepTime, dietaryPreferences, language)` | `gpt-4o-mini` | Returns 3 complete recipes as JSON |
| `analyzeFoodImage(imageUrl)` | `gpt-4o-mini` | Returns `{ foodName, calories, protein, carbs, fat, fiber }` |
| `recognizeIngredients(imageUrl, language)` | `gpt-4o-mini` | Returns `[{ ingredientName, confidence }]` |

All calls use `response_format: { type: "json_object" }` and temperature `0.7`.

---

### `notification.service`

| Function | Description |
|----------|-------------|
| `registerFcmToken(userId, { fcmToken, platform })` | Save token + platform on User |
| `sendToUser(userId, { title, body, data })` | Look up token, call `sendToToken` |
| `sendToToken(token, { title, body, data })` | FCM send — Android high priority, iOS with sound |

---

### `redis.js`

ioredis singleton client module.

| Function | Description |
|----------|-------------|
| `getClient()` | Returns (or lazily creates) the singleton `ioredis` instance |
| `connect()` | Calls `PING` to verify connectivity — called on server startup |
| `disconnect()` | Calls `QUIT` cleanly — called on SIGTERM/SIGINT |

---

### `quota.service`

Redis-backed, tier-aware daily counter. Replaces the old in-process `Map`.

**Tier defaults (code constants — `TIER_DEFAULTS`):**

| Feature | free | trial | premium |
|---------|------|-------|---------|
| `scan` | 3 | 10 | 100 |
| `recognition` | 5 | 15 | 100 |
| `ai_recipe` | 2 | 5 | 50 |

DB documents in `QuotaConfig` can override any cell. The DB value always wins.

**Redis key pattern:** `quota:{userId}:{feature}:{YYYYMMDD}`

**Atomicity:** A Lua script does `INCR` + conditional `EXPIREAT` in a single round-trip. The key auto-expires at UTC midnight.

| Function | Description |
|----------|-------------|
| `check(userId, feature)` | Resolve tier → resolve limit → atomic Redis INCR → throw 429 if over limit |
| `getUsage(userId)` | Scan `quota:{userId}:*:{today}` keys and return `{ feature: count }` map |
| `getUserTier(userId)` | Look up active `Subscription`; return `'free'` for expired trials |

---

### `storage.service`

| Function | Description |
|----------|-------------|
| `uploadBuffer(buffer, destination, mimetype)` | Upload to Firebase Storage, make file public, return HTTPS download URL |

---

## 8. Models / Database Schemas

### `User`

| Field | Type | Notes |
|-------|------|-------|
| `email` | String | Sparse unique index, lowercase |
| `passwordHash` | String | bcryptjs hash |
| `firstName` / `lastName` | String | Trimmed |
| `userType` | `'anonymous'` \| `'registered'` | Default: `'anonymous'` |
| `deviceId` | String | Sparse unique — anonymous tracking |
| `platform` | String | `ios` / `android` / `web` |
| `appVersion` | String | |
| `locale` | String | Default: `'en'` |
| `refreshToken` | String | Current valid refresh token |
| `roles` | `[String]` | Default: `['user']` |
| `fcmToken` | String | Firebase push token |
| `fcmTokenPlatform` | String | Platform of token |

---

### `UserPreference`

| Field | Type | Notes |
|-------|------|-------|
| `user` | ObjectId | Unique ref to User |
| `gender` | enum | `'male'`, `'female'`, `'other'`, null |
| `age` | Number | |
| `heightCm` | Number | |
| `activityLevel` | enum | sedentary / light / moderate / active / very_active |
| `goalType` | enum | lose_weight / maintain / gain_muscle |
| `goalTimeline` | enum | relaxed / moderate / aggressive |
| `dietaryPreferences` | `[String]` | e.g. `'vegetarian'`, `'vegan'` |
| `allergens` | `[String]` | e.g. `'gluten'`, `'nuts'` |
| `cuisinePreferences` | `[String]` | |
| `healthConditions` | `[String]` | e.g. `'diabetes_type2'` |
| `fitnessLevel` | enum | beginner / intermediate / advanced / athlete |
| `workoutPreferences` | `[String]` | |
| `physicalLimitations` | `[String]` | e.g. `'lower_back'`, `'knee'` |
| `mealsPerDay` | Number | |
| `cookTimePreference` | String | |
| `surveyResponses` | `[{ questionKey, answers }]` | Raw responses |
| `surveyCompletedAt` | Date | |

---

### `Subscription`

| Field | Type | Notes |
|-------|------|-------|
| `user` | ObjectId | Unique |
| `tier` | `'free'` \| `'premium'` \| `'trial'` | Default: `'free'` |
| `isActive` | Boolean | Default: `true` |
| `trialEndsAt` | Date | |
| `currentPeriodEnd` | Date | |
| `appleTransactionId` | String | IAP receipt |
| `appleProductId` | String | IAP product |

---

### `Recipe`

| Field | Type | Notes |
|-------|------|-------|
| `title` | String | Required, text-indexed |
| `description` | String | Text-indexed |
| `ingredients` | `[String]` | |
| `instructions` | `[String]` | |
| `prepTimeMinutes` / `cookTimeMinutes` | Number | |
| `servings` | Number | |
| `imageUrl` | String | Firebase Storage URL |
| `nutrition` | `{ calories, protein, carbs, fat, fiber }` | |
| `dietaryTags` | `[String]` | Indexed |
| `allergens` | `[String]` | |
| `cuisineType` | String | |
| `difficulty` | `'easy'` \| `'medium'` \| `'hard'` | |
| `source` | `'manual'` \| `'ai_generated'` | |
| `isPublished` | Boolean | Default: `true` |
| `isTrending` | Boolean | Default: `false` |
| `category` | String | |
| `createdBy` | ObjectId | ref: User |

---

### `FoodLogEntry`

| Field | Type | Notes |
|-------|------|-------|
| `user` | ObjectId | |
| `mealName` | String | Required |
| `calories` | Number | Required |
| `proteinGrams` / `carbsGrams` / `fatGrams` | Number | Default: 0 |
| `quantity` | Number | Default: 1 |
| `mealType` | `'breakfast'` \| `'lunch'` \| `'dinner'` \| `'snack'` | |
| `imageUrl` | String | From scan upload |
| `loggedAt` | Date | Default: now |

---

### `WaterIntake`

| Field | Type |
|-------|------|
| `user` | ObjectId |
| `amountMl` | Number (required) |
| `loggedAt` | Date |

---

### `WeightLog`

| Field | Type |
|-------|------|
| `user` | ObjectId |
| `weightKg` | Number (required) |
| `note` | String |
| `loggedAt` | Date |

---

### `GoalPlan`

| Field | Type |
|-------|------|
| `user` | ObjectId |
| `isActive` | Boolean |
| `effectiveFrom` | Date |
| `targetWeightKg` | Number |
| `targetCalories` | Number |
| `targetProteinG` / `targetCarbsG` / `targetFatG` | Number |
| `targetWaterMl` | Number |

---

### `ScanResult`

| Field | Type | Notes |
|-------|------|-------|
| `user` | ObjectId | |
| `status` | `'pending'` \| `'processing'` \| `'completed'` \| `'failed'` | |
| `type` | `'food'` \| `'ingredient'` | Default: `'food'` |
| `imageUrl` | String | Public Firebase URL |
| `firebasePath` | String | Storage path |
| `nutrition` | `{ calories, protein, carbs, fat, fiber }` | |
| `foodName` | String | Identified by GPT |
| `errorMessage` | String | On failure |
| `completedAt` | Date | |

---

### `ImageJob`

| Field | Type | Notes |
|-------|------|-------|
| `user` | ObjectId | |
| `status` | `'pending'` \| `'processing'` \| `'completed'` \| `'failed'` | |
| `imageUrl` / `firebasePath` | String | |
| `detectionResults` | `[{ ingredientName, confidence }]` | |
| `language` | String | Default: `'en'` |
| `errorMessage` | String | |
| `completedAt` | Date | |

---

### `SurveyQuestion`

| Field | Type | Notes |
|-------|------|-------|
| `key` | String | Unique identifier |
| `title` | String | Default language |
| `titleI18n` | Map\<locale, translation\> | |
| `type` | `'single'` \| `'multiple'` \| `'number'` \| `'text'` | |
| `category` | String | |
| `options` | `[{ value, label }]` | Required for single/multiple |
| `isRequired` | Boolean | |
| `isActive` | Boolean | |
| `displayOrder` | Number | |

---

### `Translation`

| Field | Type |
|-------|------|
| `key` | String (unique, dot notation) |
| `en` | String |
| `tr` | String |

---

### `QuotaConfig`

Stores **admin overrides** for per-(feature, tier) daily limits.  
If no document exists for a pair, `quota.service` falls back to `TIER_DEFAULTS` in code.

| Field | Type | Notes |
|-------|------|-------|
| `feature` | String | e.g. `'scan'`, `'recognition'`, `'ai_recipe'` |
| `tier` | `'free'` \| `'premium'` \| `'trial'` | Required |
| `dailyLimit` | Number | Overrides the code default for this pair |
| `isActive` | Boolean | Set `false` to temporarily disable this override |

**Index:** `{ feature: 1, tier: 1 }` — unique compound

---

## 9. Middleware

### `auth.js`
- Reads `Authorization: Bearer <token>`
- Verifies JWT with `config.jwt.secret`
- Attaches `req.user = { id, type, roles }` to request
- Returns **401** if missing or invalid

### `adminAuth.js`
- Requires `auth` to run first
- Queries DB to verify user has `'admin'` in `roles`
- Returns **403** if not admin

### `validate.js`
- Factory: `validate(zodSchema, source = 'body')`
- Validates `req[source]` and returns **422** with field errors if invalid
- Writes parsed output back to `req[source]`

### `upload.js`
- Multer memory storage (buffer passed to handlers)
- 10 MB file size limit
- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`

### `errorHandler.js` (global, mounted last)

| Error Type | Status | Response |
|-----------|--------|---------|
| `ApiError` | `error.status` | `{ error: { message, code } }` |
| Mongoose `ValidationError` | 422 | Field-level messages |
| Mongoose `CastError` | 400 | "Invalid ID" |
| Duplicate key (11000) | 409 | Conflicting field name |
| Multer `LIMIT_FILE_SIZE` | 400 | "File too large" |
| Anything else | 500 | "Internal Server Error" |

---

## 10. Socket.IO Real-Time Layer

Three namespaces are registered. All require a JWT in `socket.handshake.auth.token`.

### `/scan` namespace — `scan.socket.js`

**Connection:** User automatically joins room `scan:${userId}`

| Client Event | Payload | Behaviour |
|-------------|---------|-----------|
| `subscribe:scan` | `{ scanId }` | Join room `scan:${scanId}`; replay `scan:completed` / `scan:error` if already done |

| Server Event | Room | Payload |
|-------------|------|---------|
| `scan:progress` | `scan:${scanId}` | `{ scanId, progress, message }` |
| `scan:completed` | `scan:${scanId}` | `{ scanId, nutrition, foodName, foodLogId }` |
| `scan:error` | `scan:${scanId}` | `{ scanId, error }` |

---

### `/recognition` namespace — `recognition.socket.js`

| Client Event | Payload | Behaviour |
|-------------|---------|-----------|
| `subscribe:recognition` | `{ jobId }` | Join room; replay if already completed |

| Server Event | Room | Payload |
|-------------|------|---------|
| `recognition:progress` | `recognition:${jobId}` | `{ jobId, progress, message }` |
| `recognition:completed` | `recognition:${jobId}` | `{ jobId, detectionResults }` |
| `recognition:error` | `recognition:${jobId}` | `{ jobId, message }` |

---

### `/recipes` namespace — `recipes.socket.js`

| Client Event | Payload | Behaviour |
|-------------|---------|-----------|
| `subscribe:recipes` | `{ requestId }` | Join room `recipes:${requestId}` |

| Server Event | Room | Payload |
|-------------|------|---------|
| `recipes:completed` | `recipes:${requestId}` | `{ requestId, recipes }` |
| `recipes:error` | `recipes:${requestId}` | `{ requestId, message }` |

---

## 11. Authentication & Authorization

### Token Strategy

```
Client                         Server
  │                              │
  │  POST /auth/login            │
  │ ─────────────────────────► │
  │  { accessToken, refreshToken }
  │ ◄─────────────────────────  │
  │                              │
  │  Authorization: Bearer <at>  │
  │ ─────────────────────────► │  (every protected request)
```

| Token | Algorithm | Expiry | Payload |
|-------|-----------|--------|---------|
| Access | HS256 | 7 days | `{ id, type, roles }` |
| Refresh | HS256 | 30 days | `{ id, type, roles }` |

### User Types

| Type | How Created | Notes |
|------|------------|-------|
| `anonymous` | `POST /auth/anonymous/init` | Identified by `deviceId` |
| `registered` | `POST /auth/register` | Email + password required |
| `admin` | `POST /auth/admin/register` | Has `'admin'` in roles array |

### Authorization Matrix

| Middleware stack | Required |
|----------------|---------|
| `auth` only | Valid JWT |
| `auth` + `adminAuth` | Valid JWT + `roles` includes `'admin'` |
| None | Public endpoint |

---

## 12. External Integrations

### OpenAI

- **SDK:** `openai@4.52.7`
- **Model:** `gpt-4o-mini`
- **Response format:** `json_object` enforced on all calls
- **Temperature:** 0.7
- **Use cases:**

| Feature | Prompt Type | Max Tokens |
|---------|------------|-----------|
| Recipe generation | Text (ingredients + constraints) | Unlimited |
| Meal image analysis | Vision (image URL) | 300 |
| Ingredient recognition | Vision (image URL + language) | 400 |

---

### Firebase Admin SDK

- **SDK:** `firebase-admin@12.1.0`
- **Services used:** Cloud Storage, Cloud Messaging (FCM)
- **Initialisation:** Lazy singleton in `services/firebase.js`

**Storage paths:**

| Feature | Path Pattern |
|---------|-------------|
| Recipe images | `recipes/{timestamp}_{random}.{ext}` |
| Scan uploads | `scan/{userId}/{timestamp}_{filename}` |
| Recognition uploads | `recognition/{userId}/{timestamp}_{filename}` |

**FCM behaviour:**
- Android: high priority delivery
- iOS: default sound, badge increment

---

## 13. Validation & Error Handling

### Zod Schemas

Validation schemas are defined either inline in route files or in `src/schemas/cms.schemas.js`.

**Key schemas:**

| Schema | Location | Validates |
|--------|----------|-----------|
| `registerSchema` | auth.routes | email, password |
| `loginSchema` | auth.routes | email, password |
| `submitSchema` | survey.routes | array of `{ questionKey, answers }` |
| `discoverSchema` | recipe.routes | ingredients, maxPrepTime, preferences, language |
| `addFavoriteSchema` | favorite.routes | recipeId |
| `foodLogSchema` | nutrition.routes | mealName, calories, macros, mealType |
| `waterSchema` | nutrition.routes | amountMl |
| `weightLogSchema` | nutrition.routes | weightKg |
| `goalPlanSchema` | nutrition.routes | target macros, water |
| `createSurveyQuestionSchema` | cms.schemas | key, title, type, options (required for single/multiple) |

### Error Response Format

```json
{
  "error": {
    "message": "Human readable description",
    "code": "SNAKE_CASE_ERROR_CODE",
    "fields": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 202 | Accepted (async job started) |
| 204 | No Content (delete success) |
| 400 | Bad Request |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (role or ownership check failed) |
| 404 | Not Found |
| 409 | Conflict (duplicate key) |
| 422 | Unprocessable Entity (validation error) |
| 429 | Too Many Requests (quota exceeded) |
| 500 | Internal Server Error |

---

## 14. Quota / Rate Limiting

`services/quota.service.js` implements per-user daily limits backed by **Redis** and tied to the user's **Subscription tier**.

### How it works

```
check(userId, feature)
  │
  ├─► getUserTier(userId)       → Subscription lookup (expired trial → 'free')
  │
  ├─► getLimit(feature, tier)   → QuotaConfig DB override → TIER_DEFAULTS fallback
  │                               null = unlimited
  │
  └─► Redis Lua script (atomic)
        INCR  quota:{userId}:{feature}:{YYYYMMDD}
        EXPIREAT key tomorrowMidnightUTC   (only on first write)
        → new count > limit  →  throw ApiError(429)
```

### Default limits (`TIER_DEFAULTS`)

| Feature | `free` | `trial` | `premium` |
|---------|--------|---------|-----------|
| `scan` | 3/day | 10/day | 100/day |
| `recognition` | 5/day | 15/day | 100/day |
| `ai_recipe` | 2/day | 5/day | 50/day |

### Admin overrides

Admins can override any (feature, tier) pair via:
- `PUT /admin/quota/configs/:feature/:tier` — set a custom limit
- `DELETE /admin/quota/configs/:feature/:tier` — revert to code default
- `GET /admin/quota/usage/:userId` — inspect a user's current-day counters

### Key design decisions

| Decision | Rationale |
|----------|-----------|
| Lua script for atomicity | `INCR` + `EXPIREAT` in one round-trip; no race conditions across instances |
| `EXPIREAT` only on first write | Prevents TTL reset on subsequent increments within the same day |
| Tier resolved per-request | Subscription changes take effect immediately without cache invalidation |
| `null` limit = unlimited | Premium can be set unlimited per-feature without special-casing |

---

## 15. Calorie & Macro Calculator

`utils/calorie.js` implements the **Harris-Benedict formula**.

### BMR Calculation

| Sex | Formula |
|-----|---------|
| Female | `655.1 + 9.563×weight + 1.85×height − 4.676×age` |
| Male / Other | `66.47 + 13.75×weight + 5.003×height − 6.755×age` |

### TDEE Activity Multipliers

| Level | Multiplier |
|-------|-----------|
| sedentary | 1.2 |
| light | 1.375 |
| moderate | 1.55 |
| active | 1.725 |
| very_active | 1.9 |

### Goal Adjustments (kcal/day)

| Goal | Relaxed | Moderate | Aggressive |
|------|---------|----------|-----------|
| Lose Weight | −250 | −500 | −750 |
| Maintain | 0 | 0 | 0 |
| Gain Muscle | +150 | +250 | +400 |

### Macro Split

| Macro | % of TDEE |
|-------|----------|
| Protein | 25% |
| Carbs | 45% |
| Fat | 30% |

### Water Target

`35 ml × bodyweight (kg)`

### Output

`calculateTargets({ gender, age, heightCm, weightKg, activityLevel, goalType, goalTimeline })`
→ `{ calories, proteinG, carbsG, fatG, waterMl }`

---

## 16. i18n / Translations

Translations are stored in MongoDB's `Translation` collection using **dot-notation keys** (e.g., `onboarding.welcome.title`).

Each document stores values for supported locales: `en`, `tr`.

### Service Functions

| Function | Description |
|----------|-------------|
| `flatten(obj)` | Nested object → `{ 'a.b.c': 'value' }` |
| `unflatten(flat)` | Reverse |
| `getLocaleMap(locale)` | Return nested object for a locale (falls back to `'en'`) |
| `bulkUpsertTranslations(entries)` | Mass import from nested JSON |

### Client Usage

1. `GET /api/v1/translations` with `Accept-Language: tr` header
2. Receive full nested object for the requested locale
3. Cache client-side; re-fetch on locale change

---

## 17. API Documentation (Swagger)

- **UI:** `/api-docs`
- **JSON spec:** `/api-docs.json`
- **Standard:** OpenAPI 3.0.3
- **Tags:** Health, Auth, Survey, User, Recipes, Favorites, Recognition, Scan, Nutrition, Admin, CMS

---

## 18. Database Indexes

| Collection | Index | Type |
|-----------|-------|------|
| `users` | `{ deviceId: 1 }` | Sparse |
| `favorites` | `{ user: 1, recipe: 1 }` | Unique |
| `foodlogentries` | `{ user: 1, loggedAt: -1 }` | Compound |
| `waterintakes` | `{ user: 1, loggedAt: -1 }` | Compound |
| `weightlogs` | `{ user: 1, loggedAt: -1 }` | Compound |
| `goalplans` | `{ user: 1, isActive: 1 }` | Compound |
| `scanresults` | `{ user: 1, createdAt: -1 }` | Compound |
| `imagejobs` | `{ user: 1, createdAt: -1 }` | Compound |
| `recipes` | `{ title: 'text', description: 'text' }` | Full-text |
| `recipes` | `{ isPublished: 1, isTrending: 1 }` | Compound |
| `recipes` | `{ dietaryTags: 1 }` | |
| `surveyquestions` | `{ key: 1 }` | Unique |
| `translations` | `{ key: 1 }` | Unique |
| `ingredients` | `{ name: 1 }` | Unique |
| `quotaconfigs` | `{ feature: 1, tier: 1 }` | Unique compound |

---

## 19. Seed Scripts

### `scripts/seedSurveyQuestions.js`

Run with: `npm run seed:survey`

Upserts 13 onboarding questions:

| Key | Type | Category |
|-----|------|----------|
| `gender` | single | personal |
| `age` | number | personal |
| `height` | number | personal |
| `current_weight` | number | personal |
| `goal_type` | single | goals |
| `goal_weight` | number | goals |
| `goal_timeline` | single | goals |
| `cook_time` | single | lifestyle |
| `meals_per_day` | number | lifestyle |
| `health_conditions` | multiple | health |
| `fitness_level` | single | fitness |
| `workout_preference` | multiple | fitness |
| `physical_limitations` | multiple | fitness |

---

## 20. Docker & Deployment

### Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage Bun image (`oven/bun:1.1-alpine`) |
| `docker-compose.yml` | Local stack: app + MongoDB 7 + Redis 7 |
| `.dockerignore` | Excludes `.env`, `node_modules`, `.git`, logs |
| `.env.example` | Template with all required variables |

### Dockerfile (multi-stage)

```
Stage 1 — deps (oven/bun:1.1-alpine)
  COPY package.json bun.lock
  RUN bun install --frozen-lockfile --production
  → node_modules layer cached until lockfile changes

Stage 2 — release (oven/bun:1.1-alpine)
  COPY --from=deps node_modules
  COPY . .
  Non-root user (appuser)
  EXPOSE 3000
  CMD ["bun", "server.js"]
```

### docker-compose services

| Service | Image | Ports (host) | Volumes | Health check |
|---------|-------|-------------|---------|-------------|
| `app` | local build | `${PORT:-3000}:3000` | — | depends_on mongo+redis healthy |
| `mongo` | `mongo:7-jammy` | not exposed by default | `mongo_data:/data/db` | `mongosh ping` |
| `redis` | `redis:7-alpine` | not exposed by default | `redis_data:/data` | `redis-cli ping` |

Redis is configured with `appendonly yes`, `appendfsync everysec`, `maxmemory 256mb`, and `allkeys-lru` eviction.

### Quick start

```bash
cp .env.example .env          # fill in OpenAI key, Firebase creds, JWT secret
docker compose up --build     # first run
docker compose up             # subsequent runs (image cached)

# Seed survey questions into the running container
docker compose exec app bun scripts/seedSurveyQuestions.js
```

### Environment variable overrides in compose

`docker-compose.yml` always sets `MONGODB_URI` and `REDIS_URL` to the sibling container hostnames, overriding whatever is in `.env`. All other secrets come from `.env` via `env_file`.

### Production notes

- For managed Redis (Upstash, Redis Cloud) set `REDIS_URL=rediss://:password@host:port` (note `rediss://` for TLS).
- For MongoDB Atlas remove the `mongo` service from compose and set `MONGODB_URI` to your Atlas SRV string.
- The `app` service image can be pushed to any container registry; the only required change is to point `image:` at your registry URI.

---

## 21. Security Notes & Recommendations

### Critical Issues

| # | Issue | Location | Recommendation |
|---|-------|----------|---------------|
| 1 | **CMS routes are unauthenticated** | `src/routes/cms.routes.js` | Add `auth` + `adminAuth` middleware to all CMS routes before any production deployment |
| 2 | **Socket.IO CORS set to `origin: true`** | `server.js` | Restrict to known client origins using `config.cors.origins` |
| 3 | **REST CORS may be too permissive** | `src/app.js` | Confirm `CORS_ORIGINS` env is set tightly in production |
| 4 | **`JWT_SECRET` default is `change-me`** | `src/config/index.js` | Enforce a strong secret in production; fail fast if unset |

### Operational Recommendations

| # | Recommendation |
|---|---------------|
| 5 | Quota counters use Redis `KEYS` pattern scan in `getUsage()` — use `SCAN` instead in high-traffic deployments to avoid blocking Redis |
| 6 | Firebase Storage files are uploaded as **public** — consider signed URLs for private content |
| 7 | OpenAI API key and Firebase credentials should be rotated periodically |
| 8 | Add rate limiting (e.g., `express-rate-limit`) on auth endpoints to prevent brute-force |
| 9 | Consider storing the OpenAI `vision` image inline (base64) instead of public URLs to avoid data leakage |
| 10 | `refresh token` is stored as plaintext in the `users` collection — consider hashing it |
