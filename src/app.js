const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");
const { mountSwagger } = require("./swagger");

// Routes
const authRoutes = require("./routes/auth.routes");
const surveyRoutes = require("./routes/survey.routes");
const userRoutes = require("./routes/user.routes");
const recipeRoutes = require("./routes/recipe.routes");
const favoriteRoutes = require("./routes/favorite.routes");
const recognitionRoutes = require("./routes/recognition.routes");
const scanRoutes = require("./routes/scan.routes");
const nutritionRoutes = require("./routes/nutrition.routes");
const adminRoutes = require("./routes/admin.routes");
const cmsRoutes = require("./routes/cms.routes");
const translationsRoutes = require("./routes/translations.routes");

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// ─── BODY PARSERS ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

mountSwagger(app);

// ─── API ROUTES ───────────────────────────────────────────────────────────────
const API = "/api/v1";

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/survey`, surveyRoutes);
app.use(`${API}/user`, userRoutes);
app.use(`${API}/recipes/favorites`, favoriteRoutes); // must be before /recipes generic
app.use(`${API}/recipes`, recipeRoutes);
app.use(`${API}/recognition`, recognitionRoutes);
app.use(`${API}/scan`, scanRoutes);
app.use(`${API}/nutrition`, nutritionRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/cms`, cmsRoutes);
app.use(`${API}/translations`, translationsRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: { message: "Not found", code: "NOT_FOUND" } });
});

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
