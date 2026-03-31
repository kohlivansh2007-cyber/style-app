/**
 * OpenRouter API helper functions
 * Uses native fetch (Node 18+) to call OpenRouter endpoints
 */

/**
 * Generate a completion using OpenRouter with automatic model selection
 * @param {string} prompt - The prompt to send to the AI
 * @returns {string} The AI response content
 */
export async function generateOpenRouterCompletion(prompt) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('Missing OPENROUTER_API_KEY in server env');
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.FRONTEND_ORIGIN || "http://localhost:5173",
      "X-Title": "Peak Perfection"
    },
    body: JSON.stringify({
      model: "openrouter/auto",
      messages: [
        {
          role: "system",
          content: "You are a professional luxury personal stylist generating a detailed consultation report."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenRouter API error:", data);
    throw new Error("OpenRouter request failed");
  }

  const output = data.choices[0].message.content;
  return output;
}

/**
 * Generate a premium style consultation report
 * @param {Object} consultationData - The consultation data to analyze
 * @returns {Object} Structured consultation report JSON
 */
export async function generateBlueprint(consultationData) {
  const prompt = `Generate a premium personal style consultation report as STRICT JSON.

You are an elite personal stylist for "Peak Perfection" luxury consulting.

Analyze this client data and return ONLY valid JSON:
${JSON.stringify(consultationData, null, 2)}

Return JSON with this exact structure:
{
  "identity_profile": {
    "style_identity": "",
    "style_description": "",
    "lifestyle_alignment": ""
  },
  "body_analysis": {
    "body_shape": "",
    "strengths": "",
    "fit_strategy": "",
    "fabric_strategy": "",
    "tailoring_guidance": ""
  },
  "face_analysis": {
    "face_shape": "",
    "hairstyle_strategy": "",
    "recommended_hairstyles": []
  },
  "eyewear_strategy": {
    "frame_shapes": "",
    "recommended_frames": [],
    "fit_guidance": ""
  },
  "color_system": {
    "palette_explanation": "",
    "primary_palette": [],
    "secondary_palette": [],
    "contrast_strategy": ""
  },
  "wardrobe_foundation": {
    "core_philosophy": "",
    "essential_items": []
  },
  "outfit_formulas": {
    "casual_outfits": [],
    "smart_casual_outfits": [],
    "professional_outfits": []
  },
  "accessories_strategy": {
    "watches": "",
    "jewelry": "",
    "bags": "",
    "belts_and_shoes": ""
  },
  "grooming_strategy": {
    "skin_care": "",
    "hair_care": "",
    "fragrance": ""
  },
  "shopping_strategy": {
    "brand_recommendations": [],
    "shopping_priorities": []
  },
  "visual_generation_prompts": {
    "hairstyle_images": [],
    "outfit_images": [],
    "eyewear_examples": []
  }
}

Return ONLY JSON. No markdown, no explanations.`;

  console.log("Generating premium consultation report with OpenRouter");

  const aiResponse = await generateOpenRouterCompletion(prompt);

  // Clean up potential markdown code blocks
  const jsonText = aiResponse
    .replace(/^```json\s*/, '')
    .replace(/```\s*$/, '')
    .trim();

  try {
    const parsed = JSON.parse(jsonText);
    console.log("Report generated successfully");
    return parsed;
  } catch (err) {
    console.error("Failed to parse blueprint JSON:", err.message);
    console.error("Response content:", jsonText.substring(0, 500));
    throw new Error("Failed to parse AI response as JSON");
  }
}

/**
 * Generate an image using Pollinations AI (free API)
 * @param {string} prompt - The image generation prompt
 * @returns {string} URL of the generated image
 */
export async function generateImage(prompt) {
  const encodedPrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}`;
}
