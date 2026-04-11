const mongoose = require("mongoose");

const foodLogEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mealName: { type: String, required: true, trim: true },
    calories: { type: Number, required: true },
    proteinGrams: { type: Number, default: 0 },
    carbsGrams: { type: Number, default: 0 },
    fatGrams: { type: Number, default: 0 },
    quantity: { type: Number, default: 1 },
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner", "snack"],
      default: "snack",
    },
    imageUrl: { type: String },
    loggedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

foodLogEntrySchema.index({ user: 1, loggedAt: -1 });

module.exports = mongoose.model("FoodLogEntry", foodLogEntrySchema);
