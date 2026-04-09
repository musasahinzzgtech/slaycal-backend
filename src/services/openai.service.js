const OpenAI = require("openai");
const config = require("../config");

let _client = null;
function getClient() {
  if (!_client) {
    _client = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return _client;
}

/**
 * Generate recipes based on ingredients using GPT.
 */
async function generateRecipes(
  ingredients,
  maxPrepTime,
  dietaryPreferences,
  language = "en",
) {
  const constraints = [];
  if (maxPrepTime) constraints.push(`max prep time ${maxPrepTime} minutes`);
  if (dietaryPreferences?.length)
    constraints.push(`dietary: ${dietaryPreferences.join(", ")}`);

  const prompt = `You are an expert culinary instructor and professional chef. Generate 3 highly creative, restaurant-quality recipes using these ingredients: ${ingredients.join(", ")}.
${constraints.length ? `Constraints: ${constraints.join("; ")}.` : ""}

IMPORTANT LANGUAGE RULES:
- Return all text fields (title, description, ingredients, instructions, dietaryTags) in the "${language}" language.
- Use proper display format (capitalize each word).
- dietaryTags must be human-readable display labels in "${language}".
- difficulty must always be one of these exact English enum values: "easy", "medium", or "hard" (never translated).

DETAIL REQUIREMENTS:
- INGREDIENTS: Must include exact quantities, measurements, and preparation states (e.g., "2 cups of finely diced apple", "1 tbsp unsalted butter, softened").
- INSTRUCTIONS: Must be extremely detailed and beginner-friendly. Include specific heat levels, cooking techniques, exact durations for each step, and visual/sensory cues for doneness (e.g., "Heat the olive oil in a skillet over medium-high heat until shimmering, about 2 minutes. Add the apples and sauté until golden brown and tender...").

Return a JSON object containing a single key "recipes" which holds an array of the recipe objects. Each recipe must have:
- title (string)
- description (string, 2-3 engaging sentences)
- ingredients (string array, highly detailed with measurements)
- instructions (string array, comprehensive step-by-step paragraphs)
- prepTimeMinutes (number)
- cookTimeMinutes (number)
- servings (number)
- nutrition: { calories, protein, carbs, fat, fiber } (numbers, per serving)
- dietaryTags (string array, human-readable labels in "${language}")
- difficulty ("easy"|"medium"|"hard")

Return ONLY the JSON object, no extra text, no markdown blocks.`;

  const response = await getClient().chat.completions.create({
    // You can keep gpt-4o-mini. If the output is still not rich enough, upgrade to 'gpt-4o'
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const raw = response.choices[0].message.content;
  const parsed = JSON.parse(raw);

  // Since we explicitly asked for an object with a 'recipes' key, this will cleanly return the array
  return parsed.recipes || [];
}
/**
 * Analyze a food image and return nutrition info.
 * @param {string} imageUrl  publicly accessible URL or base64 data URL
 */
async function analyzeFoodImage(imageUrl) {
  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this food image and provide nutritional information.
Return a JSON object with:
- foodName (string)
- nutrition: { calories, protein, carbs, fat, fiber } (numbers, estimated per serving)

Return ONLY the JSON object.`,
          },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Recognize ingredients in an image.
 * @param {string} imageUrl
 * @returns {Array<{ ingredientName: string, confidence: number }>}
 */
async function recognizeIngredients(imageUrl, language = "en") {
  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Identify all food ingredients visible in this image.
Return ingredient names in the "${language}" language.
Use proper display text format for each name (e.g. "Green Apple", "Olive Oil", "Cherry Tomato" — capitalize each word, never all lowercase).

Return a JSON object with:
- ingredients: array of { ingredientName: string, confidence: number (0-1) }

Return ONLY the JSON object.`,
          },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 400,
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return parsed.ingredients || [];
}

module.exports = { generateRecipes, analyzeFoodImage, recognizeIngredients };
