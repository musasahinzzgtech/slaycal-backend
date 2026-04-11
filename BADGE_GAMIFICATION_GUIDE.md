# Badge Gamification System — Implementation Guide

> **App:** SlayCall (nutrition & fitness tracker)
> **Stack:** Express 4.x · Mongoose 8.x · Socket.IO 4.x · Bun runtime
> **Date:** 2026-04-11

---

## Table of Contents

1. [System Design Overview](#1-system-design-overview)
2. [Badge Catalog](#2-badge-catalog)
3. [Data Models](#3-data-models)
4. [File Structure](#4-file-structure)
5. [Backend Implementation](#5-backend-implementation)
6. [API Routes](#6-api-routes)
7. [Real-Time Events](#7-real-time-events)
8. [Push Notifications](#8-push-notifications)
9. [Frontend Integration (React Native)](#9-frontend-integration-react-native)
10. [Step-by-Step Implementation Order](#10-step-by-step-implementation-order)

---

## 1. System Design Overview

### How It Works

Badge evaluation is **event-driven**: whenever a user performs a trackable action (log a meal, complete a scan, hit a streak, etc.), a central `BadgeService.evaluate(userId, event)` function runs, checks all badge conditions relevant to that event, and awards any newly earned badges.

```
User Action → Controller → Service (existing) → BadgeService.evaluate()
                                                        ↓
                                              Check conditions against DB
                                                        ↓
                                              Award new badges (if any)
                                                        ↓
                                       Emit Socket.IO `badge:earned` event
                                                        ↓
                                       Send FCM push notification
```

### Design Principles

- **Non-blocking:** badge evaluation is fire-and-forget — it never delays the main response
- **Idempotent:** awarding is an upsert — duplicate awards are impossible by schema constraint
- **Event-typed:** each badge declares which `triggerEvents` cause it to be checked
- **Extensible:** add a new badge by inserting a document into the `Badge` collection — no code deploy needed for simple threshold badges

---

## 2. Badge Catalog

### Nutrition Logging

| Badge ID | Name | Condition | Trigger Event |
|----------|------|-----------|---------------|
| `first_meal_logged` | First Bite | Log your first meal | `meal_logged` |
| `meal_log_7` | Week Warrior | Log meals 7 days in a row | `meal_logged` |
| `meal_log_30` | Monthly Maven | Log meals 30 days in a row | `meal_logged` |
| `calorie_goal_met` | On Target | Hit calorie goal (±10%) for the first time | `meal_logged` |
| `calorie_goal_7` | Precision Week | Hit calorie goal 7 days in a row | `meal_logged` |
| `macro_master` | Macro Master | Hit all 3 macro targets in one day | `meal_logged` |

### Water Intake

| Badge ID | Name | Condition | Trigger Event |
|----------|------|-----------|---------------|
| `first_water_log` | Hydration Start | Log water for the first time | `water_logged` |
| `water_goal_met` | Hydrated | Meet daily water goal for the first time | `water_logged` |
| `water_goal_7` | Hydration Streak | Meet water goal 7 days in a row | `water_logged` |

### Weight Tracking

| Badge ID | Name | Condition | Trigger Event |
|----------|------|-----------|---------------|
| `first_weight_log` | Weigh In | Log weight for the first time | `weight_logged` |
| `weight_log_5` | Consistent Tracker | Log weight 5 times | `weight_logged` |
| `goal_weight_reached` | Goal Crusher | Reach target weight | `weight_logged` |

### AI Features (Scan / Recognition)

| Badge ID | Name | Condition | Trigger Event |
|----------|------|-----------|---------------|
| `first_scan` | Scanner | Use meal scan for the first time | `scan_completed` |
| `scan_5` | Scan Addict | Complete 5 meal scans | `scan_completed` |
| `first_ingredient_scan` | Ingredient Eye | Use ingredient recognition for the first time | `recognition_completed` |

### Recipes

| Badge ID | Name | Condition | Trigger Event |
|----------|------|-----------|---------------|
| `first_favorite` | Bookmarked | Favorite your first recipe | `recipe_favorited` |
| `first_ai_recipe` | AI Chef | Generate your first AI recipe | `ai_recipe_generated` |
| `ai_recipe_5` | Recipe Inventor | Generate 5 AI recipes | `ai_recipe_generated` |

### Onboarding & Profile

| Badge ID | Name | Condition | Trigger Event |
|----------|------|-----------|---------------|
| `survey_complete` | Profile Set | Complete the onboarding survey | `survey_completed` |
| `registered` | Member | Convert from anonymous to registered account | `user_registered` |

### Special / Milestone

| Badge ID | Name | Condition | Trigger Event |
|----------|------|-----------|---------------|
| `early_adopter` | Early Adopter | Register in first 1000 users | `user_registered` |
| `power_user` | Power User | Earn 10 other badges | `badge_earned` |

---

## 3. Data Models

### `Badge` Model — `src/models/Badge.js`

Defines available badges (seeded into DB, manageable via CMS).

```js
import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
  badgeId: {
    type: String,
    required: true,
    unique: true,           // e.g. 'meal_log_7'
  },
  name: { type: String, required: true },         // 'Week Warrior'
  description: { type: String, required: true },  // shown in UI
  iconUrl: { type: String },                      // badge image (Firebase Storage)
  category: {
    type: String,
    enum: ['nutrition', 'water', 'weight', 'scan', 'recipe', 'profile', 'special'],
    required: true,
  },
  triggerEvents: [{ type: String }],  // ['meal_logged']
  condition: {
    // For threshold badges:
    type: {
      type: String,
      enum: ['count', 'streak', 'first', 'goal_met', 'special'],
    },
    threshold: Number,      // e.g. 7 (for streak of 7)
    countField: String,     // which stat to count (optional, for 'count' type)
  },
  xpReward: { type: Number, default: 50 },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Badge', badgeSchema);
```

### `UserBadge` Model — `src/models/UserBadge.js`

Records which badges a user has earned.

```js
import mongoose from 'mongoose';

const userBadgeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  badge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Badge',
    required: true,
  },
  badgeId: { type: String, required: true },   // denormalized for fast lookups
  earnedAt: { type: Date, default: Date.now },
  seen: { type: Boolean, default: false },      // for notification dot in UI
}, { timestamps: false });

// Prevent duplicate awards
userBadgeSchema.index({ user: 1, badgeId: 1 }, { unique: true });

export default mongoose.model('UserBadge', userBadgeSchema);
```

### `UserStats` Model — `src/models/UserStats.js`

Aggregated stats used for fast badge condition evaluation. Avoids re-querying all logs on every event.

```js
import mongoose from 'mongoose';

const userStatsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  // Counts
  totalMealsLogged: { type: Number, default: 0 },
  totalScans: { type: Number, default: 0 },
  totalRecognitions: { type: Number, default: 0 },
  totalFavorites: { type: Number, default: 0 },
  totalAiRecipes: { type: Number, default: 0 },
  totalWeightLogs: { type: Number, default: 0 },
  totalBadgesEarned: { type: Number, default: 0 },

  // Streak tracking (date strings 'YYYY-MM-DD')
  mealLogStreak: { type: Number, default: 0 },
  lastMealLogDate: { type: String, default: null },

  calorieGoalStreak: { type: Number, default: 0 },
  lastCalorieGoalDate: { type: String, default: null },

  waterGoalStreak: { type: Number, default: 0 },
  lastWaterGoalDate: { type: String, default: null },

  xpTotal: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('UserStats', userStatsSchema);
```

---

## 4. File Structure

New files to add (bold = new):

```
express-backend/src/
├── models/
│   ├── ...existing...
│   ├── Badge.js              ← NEW
│   ├── UserBadge.js          ← NEW
│   └── UserStats.js          ← NEW
├── services/
│   ├── ...existing...
│   └── badge.service.js      ← NEW
├── controllers/
│   ├── ...existing...
│   └── badge.controller.js   ← NEW
├── routes/
│   ├── ...existing...
│   └── badge.routes.js       ← NEW
├── socket/
│   ├── ...existing...
│   └── badge.socket.js       ← NEW
└── scripts/
    └── seedBadges.js         ← NEW
```

Existing files to modify:

```
src/services/nutrition.service.js       ← call BadgeService on meal/water/weight log
src/services/scan.service.js            ← call BadgeService on scan_completed
src/services/recognition.service.js     ← call BadgeService on recognition_completed
src/services/favorite.service.js        ← call BadgeService on recipe_favorited
src/services/recipe.service.js          ← call BadgeService on ai_recipe_generated
src/services/survey.service.js          ← call BadgeService on survey_completed
src/services/auth.service.js            ← call BadgeService on user_registered
src/app.js                              ← mount badge routes
server.js                               ← register /badges Socket.IO namespace
```

---

## 5. Backend Implementation

### `src/services/badge.service.js`

```js
import Badge from '../models/Badge.js';
import UserBadge from '../models/UserBadge.js';
import UserStats from '../models/UserStats.js';
import FoodLogEntry from '../models/FoodLogEntry.js';
import WaterIntake from '../models/WaterIntake.js';
import GoalPlan from '../models/GoalPlan.js';
import User from '../models/User.js';
import notificationService from './notification.service.js';

let io = null;

export function setIo(ioInstance) {
  io = ioInstance;
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Call this after any user action.
 * Fire-and-forget — wrap the caller in a try/catch but never await this.
 *
 * @param {string} userId
 * @param {string} event  - e.g. 'meal_logged', 'scan_completed'
 * @param {object} ctx    - extra context (e.g. { date, calories, goalCalories })
 */
export async function evaluate(userId, event, ctx = {}) {
  try {
    // 1. Ensure UserStats doc exists
    const stats = await UserStats.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId } },
      { upsert: true, new: true }
    );

    // 2. Update stats for this event
    await updateStats(userId, stats, event, ctx);

    // 3. Find all active badges triggered by this event
    const candidates = await Badge.find({ triggerEvents: event, isActive: true });

    // 4. Get badges this user already has
    const existing = await UserBadge.find({ user: userId }).distinct('badgeId');
    const existingSet = new Set(existing);

    // 5. Check and award
    const freshStats = await UserStats.findOne({ user: userId });
    const awarded = [];

    for (const badge of candidates) {
      if (existingSet.has(badge.badgeId)) continue;
      if (await checkCondition(userId, badge, freshStats, ctx)) {
        const ub = await awardBadge(userId, badge, freshStats);
        if (ub) awarded.push({ badge, userBadge: ub });
      }
    }

    // 6. Check meta-badge ('power_user') if any badge was just awarded
    if (awarded.length > 0) {
      await checkPowerUserBadge(userId, freshStats);
    }

    // 7. Notify for each awarded badge
    for (const { badge, userBadge } of awarded) {
      emitBadgeEarned(userId, badge, userBadge);
      sendBadgePush(userId, badge);
    }
  } catch (err) {
    console.error('[BadgeService] evaluate error:', err.message);
  }
}

// ─── Stats update ─────────────────────────────────────────────────────────────

async function updateStats(userId, stats, event, ctx) {
  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  const update = {};

  if (event === 'meal_logged') {
    update.$inc = { totalMealsLogged: 1 };
    // Streak logic
    if (stats.lastMealLogDate === today) {
      // Already logged today — no streak change
    } else if (isYesterday(stats.lastMealLogDate, today)) {
      update.$inc.mealLogStreak = 1;
    } else {
      update.$set = { mealLogStreak: 1 };
    }
    update.$set = { ...(update.$set || {}), lastMealLogDate: today };
  }

  if (event === 'water_logged' && ctx.goalMet) {
    if (stats.lastWaterGoalDate === today) {
      // no-op
    } else if (isYesterday(stats.lastWaterGoalDate, today)) {
      update.$inc = { ...(update.$inc || {}), waterGoalStreak: 1 };
    } else {
      update.$set = { ...(update.$set || {}), waterGoalStreak: 1 };
    }
    update.$set = { ...(update.$set || {}), lastWaterGoalDate: today };
  }

  if (event === 'scan_completed') update.$inc = { totalScans: 1 };
  if (event === 'recognition_completed') update.$inc = { totalRecognitions: 1 };
  if (event === 'recipe_favorited') update.$inc = { totalFavorites: 1 };
  if (event === 'ai_recipe_generated') update.$inc = { totalAiRecipes: 1 };
  if (event === 'weight_logged') update.$inc = { totalWeightLogs: 1 };

  if (Object.keys(update).length > 0) {
    await UserStats.updateOne({ user: userId }, update);
  }
}

function isYesterday(dateStr, today) {
  if (!dateStr) return false;
  const d = new Date(today);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0] === dateStr;
}

// ─── Condition checks ─────────────────────────────────────────────────────────

async function checkCondition(userId, badge, stats, ctx) {
  const { badgeId, condition } = badge;

  switch (badgeId) {
    // ── Firsts ──
    case 'first_meal_logged':     return stats.totalMealsLogged >= 1;
    case 'first_water_log':       return true; // event itself is the trigger
    case 'first_weight_log':      return stats.totalWeightLogs >= 1;
    case 'first_scan':            return stats.totalScans >= 1;
    case 'first_ingredient_scan': return stats.totalRecognitions >= 1;
    case 'first_favorite':        return stats.totalFavorites >= 1;
    case 'first_ai_recipe':       return stats.totalAiRecipes >= 1;

    // ── Counts ──
    case 'scan_5':        return stats.totalScans >= 5;
    case 'ai_recipe_5':   return stats.totalAiRecipes >= 5;
    case 'weight_log_5':  return stats.totalWeightLogs >= 5;

    // ── Streaks ──
    case 'meal_log_7':      return stats.mealLogStreak >= 7;
    case 'meal_log_30':     return stats.mealLogStreak >= 30;
    case 'water_goal_7':    return stats.waterGoalStreak >= 7;
    case 'calorie_goal_7':  return stats.calorieGoalStreak >= 7;

    // ── Goal checks (need live data) ──
    case 'calorie_goal_met':
    case 'water_goal_met':
      return ctx.goalMet === true;

    case 'macro_master':
      return ctx.macroGoalMet === true;

    case 'goal_weight_reached':
      return ctx.goalReached === true;

    // ── Survey / Auth ──
    case 'survey_complete': return true;
    case 'registered':      return true;

    // ── Special ──
    case 'early_adopter': {
      const count = await User.countDocuments({ userType: 'registered' });
      return count <= 1000;
    }

    default:
      // Generic threshold from condition.threshold
      if (condition?.type === 'streak' && condition.threshold) {
        const streakField = `${ctx.streakField}Streak`;
        return (stats[streakField] || 0) >= condition.threshold;
      }
      return false;
  }
}

// ─── Award ────────────────────────────────────────────────────────────────────

async function awardBadge(userId, badge, stats) {
  try {
    const ub = await UserBadge.create({
      user: userId,
      badge: badge._id,
      badgeId: badge.badgeId,
    });
    await UserStats.updateOne(
      { user: userId },
      { $inc: { totalBadgesEarned: 1, xpTotal: badge.xpReward || 0 } }
    );
    return ub;
  } catch (err) {
    if (err.code === 11000) return null; // duplicate — race condition guard
    throw err;
  }
}

async function checkPowerUserBadge(userId, stats) {
  const powerBadge = await Badge.findOne({ badgeId: 'power_user', isActive: true });
  if (!powerBadge) return;
  const freshStats = await UserStats.findOne({ user: userId });
  if (freshStats.totalBadgesEarned >= 10) {
    const existing = await UserBadge.findOne({ user: userId, badgeId: 'power_user' });
    if (!existing) {
      const ub = await awardBadge(userId, powerBadge, freshStats);
      if (ub) {
        emitBadgeEarned(userId, powerBadge, ub);
        sendBadgePush(userId, powerBadge);
      }
    }
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────

function emitBadgeEarned(userId, badge, userBadge) {
  if (!io) return;
  io.of('/badges').to(`user:${userId}`).emit('badge:earned', {
    badgeId: badge.badgeId,
    name: badge.name,
    description: badge.description,
    iconUrl: badge.iconUrl,
    xpReward: badge.xpReward,
    earnedAt: userBadge.earnedAt,
  });
}

function sendBadgePush(userId, badge) {
  // fire-and-forget
  notificationService
    .sendToUser(userId, {
      title: `🏅 Badge Earned: ${badge.name}`,
      body: badge.description,
      data: { type: 'badge_earned', badgeId: badge.badgeId },
    })
    .catch(() => {});
}

export default { evaluate, setIo };
```

---

### Hooking Into Existing Services

Add one fire-and-forget line at the end of each relevant service function.

#### `nutrition.service.js` — `createFoodLog`

```js
import badgeService from './badge.service.js';

// At the end of createFoodLog(), after saving the entry:
badgeService.evaluate(userId, 'meal_logged', { date: today }).catch(() => {});

// After computing daily totals, check calorie goal:
const goalMet = Math.abs(dailyCalories - targetCalories) / targetCalories <= 0.10;
badgeService.evaluate(userId, 'meal_logged', { goalMet, date: today }).catch(() => {});
```

#### `nutrition.service.js` — `createWaterIntake`

```js
// After inserting, compute total for today vs goal:
const goalMet = totalMlToday >= goalPlan.targetWaterMl;
badgeService.evaluate(userId, 'water_logged', { goalMet }).catch(() => {});
```

#### `nutrition.service.js` — `createWeightLog`

```js
const goalPlan = await GoalPlan.findOne({ user: userId, isActive: true });
const goalReached = goalPlan && newWeight <= goalPlan.targetWeightKg;
badgeService.evaluate(userId, 'weight_logged', { goalReached }).catch(() => {});
```

#### `scan.service.js` — `processScan` (after `scan:completed`)

```js
badgeService.evaluate(userId, 'scan_completed').catch(() => {});
```

#### `recognition.service.js` — `processImage` (after `recognition:completed`)

```js
badgeService.evaluate(userId, 'recognition_completed').catch(() => {});
```

#### `favorite.service.js` — `addFavorite`

```js
badgeService.evaluate(userId, 'recipe_favorited').catch(() => {});
```

#### `recipe.service.js` — `startDiscoverRecipes` (after AI generation)

```js
badgeService.evaluate(userId, 'ai_recipe_generated').catch(() => {});
```

#### `survey.service.js` — `submitSurvey`

```js
badgeService.evaluate(userId, 'survey_completed').catch(() => {});
```

#### `auth.service.js` — `register`

```js
badgeService.evaluate(user._id.toString(), 'user_registered').catch(() => {});
```

---

## 6. API Routes

### `src/routes/badge.routes.js`

```js
import { Router } from 'express';
import auth from '../middleware/auth.js';
import badgeController from '../controllers/badge.controller.js';

const router = Router();

router.get('/',            auth, badgeController.getAllBadges);     // catalog
router.get('/my',          auth, badgeController.getMyBadges);      // earned
router.get('/my/unseen',   auth, badgeController.getUnseenBadges);  // notification dot
router.post('/my/seen',    auth, badgeController.markAllSeen);      // clear dot
router.get('/my/stats',    auth, badgeController.getMyStats);       // XP, streaks

export default router;
```

Mount in `src/app.js`:

```js
import badgeRoutes from './routes/badge.routes.js';
app.use('/api/v1/badges', badgeRoutes);
```

### `src/controllers/badge.controller.js`

```js
import Badge from '../models/Badge.js';
import UserBadge from '../models/UserBadge.js';
import UserStats from '../models/UserStats.js';

export async function getAllBadges(req, res, next) {
  try {
    const badges = await Badge.find({ isActive: true }).sort('displayOrder');
    const earned = await UserBadge.find({ user: req.user.id }).distinct('badgeId');
    const earnedSet = new Set(earned);
    res.json({
      badges: badges.map(b => ({
        ...b.toObject(),
        earned: earnedSet.has(b.badgeId),
      })),
    });
  } catch (err) { next(err); }
}

export async function getMyBadges(req, res, next) {
  try {
    const ubs = await UserBadge.find({ user: req.user.id })
      .populate('badge')
      .sort('-earnedAt');
    res.json({ badges: ubs });
  } catch (err) { next(err); }
}

export async function getUnseenBadges(req, res, next) {
  try {
    const unseen = await UserBadge.find({ user: req.user.id, seen: false })
      .populate('badge');
    res.json({ count: unseen.length, badges: unseen });
  } catch (err) { next(err); }
}

export async function markAllSeen(req, res, next) {
  try {
    await UserBadge.updateMany({ user: req.user.id, seen: false }, { seen: true });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

export async function getMyStats(req, res, next) {
  try {
    const stats = await UserStats.findOne({ user: req.user.id });
    res.json({ stats: stats || {} });
  } catch (err) { next(err); }
}

export default { getAllBadges, getMyBadges, getUnseenBadges, markAllSeen, getMyStats };
```

---

## 7. Real-Time Events

### Register namespace in `server.js`

```js
import badgeSocket from './src/socket/badge.socket.js';
import badgeService from './src/services/badge.service.js';

// After existing namespace registrations:
const badgesNs = io.of('/badges');
badgeSocket(badgesNs);
badgeService.setIo(io);
```

### `src/socket/badge.socket.js`

```js
export default function badgeSocket(ns) {
  ns.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }
    socket.on('disconnect', () => {});
  });
}
```

**Client event format:**

```json
// Event: badge:earned
{
  "badgeId": "meal_log_7",
  "name": "Week Warrior",
  "description": "Log meals 7 days in a row",
  "iconUrl": "https://storage.googleapis.com/.../badge-week-warrior.png",
  "xpReward": 100,
  "earnedAt": "2026-04-11T12:34:56.000Z"
}
```

---

## 8. Push Notifications

Already handled inside `badge.service.js` via `notification.service.sendToUser()`. The `data` payload contains `type: 'badge_earned'` and `badgeId` so the mobile app can deep-link to the badge detail screen.

FCM `data` schema:

```json
{
  "type": "badge_earned",
  "badgeId": "meal_log_7"
}
```

---

## 9. Frontend Integration (React Native)

### Socket.IO connection

```ts
import { io } from 'socket.io-client';

const badgeSocket = io(`${API_BASE_URL}/badges`, {
  auth: { userId: currentUser.id },
  transports: ['websocket'],
});

badgeSocket.on('badge:earned', (badge) => {
  // Show celebration modal / toast
  showBadgeModal(badge);
  // Update local badge state
  dispatch(addEarnedBadge(badge));
});
```

### API calls

```ts
// Get full catalog with earned status
GET /api/v1/badges

// Get user's earned badges
GET /api/v1/badges/my

// Get unseen count (notification dot)
GET /api/v1/badges/my/unseen

// Mark all seen (on badge screen open)
POST /api/v1/badges/my/seen

// XP and streak stats
GET /api/v1/badges/my/stats
```

### Suggested UI Components

| Component | Description |
|-----------|-------------|
| `BadgeCatalogScreen` | Grid of all badges, greyed out if not earned |
| `BadgeDetailModal` | Full badge info + earned date |
| `BadgeCelebrationModal` | Confetti animation shown on `badge:earned` event |
| `BadgeNotificationDot` | Red dot on profile/achievements tab |
| `XPProgressBar` | Shows total XP and streak info |

---

## 10. Step-by-Step Implementation Order

Follow this order to ship incrementally without breaking existing functionality:

- [ ] **Step 1 — Models:** Create `Badge.js`, `UserBadge.js`, `UserStats.js`
- [ ] **Step 2 — Seed:** Create `scripts/seedBadges.js` and run it to populate the Badge catalog
- [ ] **Step 3 — Badge Service:** Create `src/services/badge.service.js`
- [ ] **Step 4 — Hooks:** Add `badgeService.evaluate()` calls to all 8 existing services
- [ ] **Step 5 — Controller + Routes:** Create controller and routes, mount in `app.js`
- [ ] **Step 6 — Socket:** Create `badge.socket.js`, register namespace in `server.js`, call `badgeService.setIo()`
- [ ] **Step 7 — Test:** Manually trigger each event type and confirm badges are awarded
- [ ] **Step 8 — CMS:** Add badge CRUD to CMS routes for admin management of badge catalog
- [ ] **Step 9 — Frontend:** Connect Socket.IO, add badge screens and celebration modal
- [ ] **Step 10 — Seed badge icons:** Upload badge images to Firebase Storage and update `iconUrl` fields

---

## Seed Script — `scripts/seedBadges.js`

```js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Badge from '../src/models/Badge.js';

const badges = [
  // Nutrition
  { badgeId: 'first_meal_logged', name: 'First Bite',       description: 'Log your first meal',                         category: 'nutrition', triggerEvents: ['meal_logged'],          condition: { type: 'first' },               xpReward: 25,  displayOrder: 1 },
  { badgeId: 'meal_log_7',        name: 'Week Warrior',     description: 'Log meals 7 days in a row',                   category: 'nutrition', triggerEvents: ['meal_logged'],          condition: { type: 'streak', threshold: 7 }, xpReward: 100, displayOrder: 2 },
  { badgeId: 'meal_log_30',       name: 'Monthly Maven',    description: 'Log meals 30 days in a row',                  category: 'nutrition', triggerEvents: ['meal_logged'],          condition: { type: 'streak', threshold: 30 },xpReward: 500, displayOrder: 3 },
  { badgeId: 'calorie_goal_met',  name: 'On Target',        description: 'Hit your calorie goal for the first time',    category: 'nutrition', triggerEvents: ['meal_logged'],          condition: { type: 'goal_met' },            xpReward: 50,  displayOrder: 4 },
  { badgeId: 'calorie_goal_7',    name: 'Precision Week',   description: 'Hit your calorie goal 7 days in a row',       category: 'nutrition', triggerEvents: ['meal_logged'],          condition: { type: 'streak', threshold: 7 }, xpReward: 200, displayOrder: 5 },
  { badgeId: 'macro_master',      name: 'Macro Master',     description: 'Hit all 3 macro targets in one day',          category: 'nutrition', triggerEvents: ['meal_logged'],          condition: { type: 'goal_met' },            xpReward: 150, displayOrder: 6 },
  // Water
  { badgeId: 'first_water_log',   name: 'Hydration Start',  description: 'Log water for the first time',                category: 'water',     triggerEvents: ['water_logged'],         condition: { type: 'first' },               xpReward: 25,  displayOrder: 10 },
  { badgeId: 'water_goal_met',    name: 'Hydrated',         description: 'Meet your daily water goal',                  category: 'water',     triggerEvents: ['water_logged'],         condition: { type: 'goal_met' },            xpReward: 50,  displayOrder: 11 },
  { badgeId: 'water_goal_7',      name: 'Hydration Streak', description: 'Meet your water goal 7 days in a row',        category: 'water',     triggerEvents: ['water_logged'],         condition: { type: 'streak', threshold: 7 }, xpReward: 150, displayOrder: 12 },
  // Weight
  { badgeId: 'first_weight_log',  name: 'Weigh In',         description: 'Log your weight for the first time',          category: 'weight',    triggerEvents: ['weight_logged'],        condition: { type: 'first' },               xpReward: 25,  displayOrder: 20 },
  { badgeId: 'weight_log_5',      name: 'Consistent Tracker',description: 'Log your weight 5 times',                   category: 'weight',    triggerEvents: ['weight_logged'],        condition: { type: 'count', threshold: 5 }, xpReward: 75,  displayOrder: 21 },
  { badgeId: 'goal_weight_reached',name: 'Goal Crusher',    description: 'Reach your target weight',                    category: 'weight',    triggerEvents: ['weight_logged'],        condition: { type: 'goal_met' },            xpReward: 500, displayOrder: 22 },
  // Scan
  { badgeId: 'first_scan',        name: 'Scanner',          description: 'Use meal scan for the first time',            category: 'scan',      triggerEvents: ['scan_completed'],       condition: { type: 'first' },               xpReward: 50,  displayOrder: 30 },
  { badgeId: 'scan_5',            name: 'Scan Addict',      description: 'Complete 5 meal scans',                       category: 'scan',      triggerEvents: ['scan_completed'],       condition: { type: 'count', threshold: 5 }, xpReward: 100, displayOrder: 31 },
  { badgeId: 'first_ingredient_scan', name: 'Ingredient Eye', description: 'Use ingredient recognition for the first time', category: 'scan', triggerEvents: ['recognition_completed'], condition: { type: 'first' },              xpReward: 50,  displayOrder: 32 },
  // Recipe
  { badgeId: 'first_favorite',    name: 'Bookmarked',       description: 'Favorite your first recipe',                  category: 'recipe',    triggerEvents: ['recipe_favorited'],     condition: { type: 'first' },               xpReward: 25,  displayOrder: 40 },
  { badgeId: 'first_ai_recipe',   name: 'AI Chef',          description: 'Generate your first AI recipe',               category: 'recipe',    triggerEvents: ['ai_recipe_generated'],  condition: { type: 'first' },               xpReward: 75,  displayOrder: 41 },
  { badgeId: 'ai_recipe_5',       name: 'Recipe Inventor',  description: 'Generate 5 AI recipes',                       category: 'recipe',    triggerEvents: ['ai_recipe_generated'],  condition: { type: 'count', threshold: 5 }, xpReward: 200, displayOrder: 42 },
  // Profile
  { badgeId: 'survey_complete',   name: 'Profile Set',      description: 'Complete the onboarding survey',              category: 'profile',   triggerEvents: ['survey_completed'],     condition: { type: 'first' },               xpReward: 50,  displayOrder: 50 },
  { badgeId: 'registered',        name: 'Member',           description: 'Create a full account',                       category: 'profile',   triggerEvents: ['user_registered'],      condition: { type: 'first' },               xpReward: 50,  displayOrder: 51 },
  // Special
  { badgeId: 'early_adopter',     name: 'Early Adopter',    description: 'One of the first 1,000 members',              category: 'special',   triggerEvents: ['user_registered'],      condition: { type: 'special' },             xpReward: 250, displayOrder: 60 },
  { badgeId: 'power_user',        name: 'Power User',       description: 'Earn 10 badges',                              category: 'special',   triggerEvents: ['badge_earned'],         condition: { type: 'count', threshold: 10 },xpReward: 500, displayOrder: 61 },
];

await mongoose.connect(process.env.MONGODB_URI);
await Badge.deleteMany({});
await Badge.insertMany(badges);
console.log(`Seeded ${badges.length} badges.`);
await mongoose.disconnect();
```

Run with: `bun run scripts/seedBadges.js`

---

## CMS Extension (Optional — Step 8)

Add badge management to the existing CMS routes so admins can create/edit badges without code changes.

```
GET    /api/v1/cms/badges          — list all badges
POST   /api/v1/cms/badges          — create badge
PATCH  /api/v1/cms/badges/:id      — update badge (name, description, xpReward, isActive)
DELETE /api/v1/cms/badges/:id      — delete badge
```

---

## Notes & Suggestions

### XP Leaderboard (future)

`UserStats.xpTotal` is already tracked. A leaderboard can be added with:

```js
UserStats.find().sort('-xpTotal').limit(50).populate('user', 'firstName lastName')
```

### Streak Recovery (future)

Consider a "streak freeze" item (like Duolingo) — store `streakFreezes` count in `UserStats` and consume one before resetting a streak.

### i18n

Badge `name` and `description` can be stored in `Translation` collection using dot-notation keys like `badge.meal_log_7.name` and resolved through the existing `translation.service`.

### Analytics

Each `UserBadge` document has `earnedAt`. You can query badge acquisition rates to see which badges are too easy, too hard, or creating engagement spikes.

### Admin Dashboard

The existing admin panel can surface:
- Total badges awarded per badge type
- User XP leaderboard
- Streak distribution charts
