/**
 * Generate styling report using OpenRouter API
 */

import { generateOpenRouterCompletion } from './utils/openrouter.js';

export async function generateReport({ sections, client: clientRow }) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('Missing OPENROUTER_API_KEY in server env');
  }

  const prompt = `You are a professional personal stylist generating a structured style blueprint for a premium $300 consultation report.

Client: ${clientRow?.name ?? 'Client'} (${clientRow?.gender ?? 'person'})

Consultation Data:
${JSON.stringify(sections ?? {}, null, 2)}

Return ONLY a valid JSON object. No markdown. No extra text. No explanation.

The JSON must have EXACTLY these keys:

{
  "meta": {
    "client_name": "string - client first name",
    "archetype_primary": "string - e.g. Classic Minimalist",
    "archetype_secondary": "string - e.g. Effortless Natural",
    "archetype_description": "string - 2 sentence brand statement for this client",
    "style_words": ["word1", "word2", "word3", "word4", "word5"]
  },
  "style_identity": {
    "overview": "string - 3 sentences about who this client is and what their wardrobe must do",
    "lifestyle_strategy": "string - 2 sentences on lifestyle demands and fabric/mobility needs"
  },
  "palette": [
    { "hex": "#F5F0E8", "label": "Ivory", "role": "base", "usage": "one sentence" },
    { "hex": "#E8DCC8", "label": "Warm Sand", "role": "base", "usage": "one sentence" },
    { "hex": "#C8B89A", "label": "Tan", "role": "mid", "usage": "one sentence" },
    { "hex": "#8B7355", "label": "Camel", "role": "mid", "usage": "one sentence" },
    { "hex": "#3D3D3D", "label": "Charcoal", "role": "anchor", "usage": "one sentence" },
    { "hex": "#1A1A1A", "label": "Ink", "role": "anchor", "usage": "one sentence" }
  ],
  "palette_avoid": ["color 1 to avoid and why", "color 2", "color 3"],
  "body_harmony": {
    "shape": "string - body shape name",
    "objective": "string - 1 sentence on what the styling goal is",
    "principles": ["principle 1", "principle 2", "principle 3", "principle 4", "principle 5"],
    "avoid": ["avoid 1", "avoid 2", "avoid 3"]
  },
  "capsule": {
    "tops": [
      { "qty": "3×", "name": "Crew neck t-shirts", "colors": "White · Grey · Black" }
    ],
    "bottoms": [
      { "qty": "2×", "name": "Slim chinos", "colors": "Tan · Grey" }
    ],
    "outerwear": [
      { "qty": "1×", "name": "Fitted bomber jacket", "colors": "Olive or Black" }
    ],
    "footwear": [
      { "qty": "1×", "name": "White leather sneakers", "colors": "Clean, versatile" }
    ]
  },
  "outfits": [
    {
      "name": "string - outfit display name",
      "occasion": "string - e.g. Student / Daily",
      "items": ["item 1", "item 2", "item 3", "item 4"],
      "note": "string - one styling tip"
    }
  ],
  "grooming": {
    "haircut": "string - specific recommendation",
    "shave": "string - recommendation",
    "skincare": "string - routine recommendation",
    "fragrance": "string - scent direction"
  },
  "shopping": [
    { "priority": "1", "item": "string", "brands": "string", "tier": "Invest or Mid or Foundation" }
  ],
  "dos": ["do rule 1", "do rule 2", "do rule 3", "do rule 4", "do rule 5"],
  "donts": ["dont rule 1", "dont rule 2", "dont rule 3", "dont rule 4", "dont rule 5"],
  "closing_message": "string - 3 sentence personal, empowering closing message to the client by name"
}

Generate 4 outfits. Generate 8 capsule tops, 5 bottoms, 3 outerwear, 4 footwear. Generate 8 shopping items. Make all content specific to this client's data — no generic advice.`;

  try {
    console.log('Generating premium consultation report with OpenRouter');

    const aiResponse = await generateOpenRouterCompletion(prompt);

    // Clean up potential markdown blocks
    const jsonText = aiResponse.replace(/^```json\s*/, '').replace(/```$/, '').trim();

    const parsed = JSON.parse(jsonText);

    console.log('Report generated successfully');
    return parsed;
  } catch (err) {
    console.error('AI Report Generation Failed:', err);
    throw err;
  }
}

