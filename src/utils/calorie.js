/**
 * Harris-Benedict calorie & macro calculator.
 * @param {object} params
 * @param {'male'|'female'|'other'} params.gender
 * @param {number} params.age           years
 * @param {number} params.heightCm
 * @param {number} params.weightKg
 * @param {'sedentary'|'light'|'moderate'|'active'|'very_active'} params.activityLevel
 * @param {'lose_weight'|'maintain'|'gain_muscle'} params.goalType
 * @param {'relaxed'|'moderate'|'aggressive'} [params.goalTimeline]
 * @returns {{ calories, proteinG, carbsG, fatG, waterMl }}
 */
function calculateTargets({ gender, age, heightCm, weightKg, activityLevel, goalType, goalTimeline }) {
  if (!age || !heightCm || !weightKg) return null;

  // BMR — Harris-Benedict revised (Mifflin-St Jeor is more accurate but plan says Harris-Benedict)
  let bmr;
  if (gender === 'female') {
    bmr = 655.1 + 9.563 * weightKg + 1.85 * heightCm - 4.676 * age;
  } else {
    // male or other
    bmr = 66.47 + 13.75 * weightKg + 5.003 * heightCm - 6.755 * age;
  }

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const multiplier = activityMultipliers[activityLevel] || 1.2;
  let tdee = bmr * multiplier;

  // Goal adjustments scaled by timeline (default: moderate)
  const timeline = goalTimeline || 'moderate';
  const loseAdjustment = { relaxed: -250, moderate: -500, aggressive: -750 };
  const gainAdjustment = { relaxed: 150, moderate: 250, aggressive: 400 };

  if (goalType === 'lose_weight') tdee += loseAdjustment[timeline] ?? -500;
  else if (goalType === 'gain_muscle') tdee += gainAdjustment[timeline] ?? 250;

  const calories = Math.round(tdee);

  // Macro split: protein 25%, carbs 45%, fat 30%
  const proteinG = Math.round((calories * 0.25) / 4);
  const carbsG = Math.round((calories * 0.45) / 4);
  const fatG = Math.round((calories * 0.3) / 9);

  // Water: 35ml per kg bodyweight
  const waterMl = Math.round(weightKg * 35);

  return { calories, proteinG, carbsG, fatG, waterMl };
}

module.exports = { calculateTargets };
