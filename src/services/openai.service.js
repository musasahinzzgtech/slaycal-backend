const OpenAI = require('openai');
const config = require('../config');

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
async function generateRecipes(ingredients, maxPrepTime, dietaryPreferences, language = 'en') {
  const constraints = [];
  if (maxPrepTime) constraints.push(`max prep time ${maxPrepTime} minutes`);
  if (dietaryPreferences?.length) constraints.push(`dietary: ${dietaryPreferences.join(', ')}`);

  const prompt = `You are a professional chef. Generate 3 creative recipes using these ingredients: ${ingredients.join(', ')}.
${constraints.length ? `Constraints: ${constraints.join('; ')}.` : ''}

IMPORTANT LANGUAGE RULES:
- Return all text fields (title, description, ingredients, instructions, dietaryTags) in the "${language}" language.
- Use proper display format (capitalize each word, e.g. "Zeytinyağlı Tavuk" or "Olive Oil Chicken").
- dietaryTags must be human-readable display labels in "${language}" (e.g. in Turkish: "Gluten Yok", "Vegan", "Vejeteryan", "Süt Ürünü Yok", "Düşük Karbonhidrat"; in English: "Gluten Free", "Vegan", "Vegetarian", "Dairy Free", "Low Carb").
- difficulty must always be one of these exact English enum values: "easy", "medium", or "hard" (never translated).

Return a JSON array of recipes. Each recipe must have:
- title (string)
- description (string, 1-2 sentences)
- ingredients (string array)
- instructions (string array, step by step)
- prepTimeMinutes (number)
- cookTimeMinutes (number)
- servings (number)
- nutrition: { calories, protein, carbs, fat, fiber } (numbers, per serving)
- dietaryTags (string array, human-readable labels in "${language}")
- difficulty ("easy"|"medium"|"hard")

Return ONLY the JSON array, no extra text.`;

  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const raw = response.choices[0].message.content;
  const parsed = JSON.parse(raw);
  // Handle both { recipes: [...] } and [...] shapes
  return Array.isArray(parsed) ? parsed : parsed.recipes || [];
}

/**
 * Analyze a food image and return nutrition info.
 * @param {string} imageUrl  publicly accessible URL or base64 data URL
 */
async function analyzeFoodImage(imageUrl) {
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this food image and provide nutritional information.
Return a JSON object with:
- foodName (string)
- nutrition: { calories, protein, carbs, fat, fiber } (numbers, estimated per serving)

Return ONLY the JSON object.`,
          },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 300,
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Recognize ingredients in an image.
 * @param {string} imageUrl
 * @returns {Array<{ ingredientName: string, confidence: number }>}
 */
async function recognizeIngredients(imageUrl, language = 'en') {
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Identify all food ingredients visible in this image.
Return ingredient names in the "${language}" language.
Use proper display text format for each name (e.g. "Green Apple", "Olive Oil", "Cherry Tomato" — capitalize each word, never all lowercase).

Return a JSON object with:
- ingredients: array of { ingredientName: string, confidence: number (0-1) }

Return ONLY the JSON object.`,
          },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 400,
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return parsed.ingredients || [];
}

module.exports = { generateRecipes, analyzeFoodImage, recognizeIngredients };
