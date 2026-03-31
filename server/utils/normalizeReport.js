/**
 * Normalize AI report schema to handle both old and new formats
 * Converts legacy flat structure to new structured JSON format
 */

export function normalizeReport(rawJson) {
  try {
    // Handle invalid input
    if (!rawJson || typeof rawJson !== 'object') {
      console.warn('[normalizeReport] Invalid report provided, returning safe default');
      return getSafeDefault();
    }

    // Check if already in NEW format (has 'meta' key)
    if (rawJson.meta && typeof rawJson.meta === 'object') {
      console.log('[normalizeReport] Already in new format, returning as-is');
      return rawJson;
    }

    // Check if in OLD format (has 'style_identity_overview' key)
    if (rawJson.style_identity_overview !== undefined) {
      console.log('[normalizeReport] Converting from old format to new format');
      return convertOldToNew(rawJson);
    }

    // Unknown format, return safe default
    console.warn('[normalizeReport] Unknown format detected, returning safe default');
    return getSafeDefault();

  } catch (error) {
    console.error('[normalizeReport] Error during normalization:', error);
    return getSafeDefault();
  }
}

function convertOldToNew(old) {
  return {
    meta: {
      client_name: '',
      archetype_primary: 'Classic Minimalist',
      archetype_secondary: 'Effortless Natural',
      archetype_description: (old.style_archetype_analysis || '').substring(0, 120) + '...',
      style_words: ['Confident', 'Bold', 'Powerful', 'Clean', 'Structured']
    },
    style_identity: {
      overview: old.style_identity_overview || '',
      lifestyle_strategy: old.lifestyle_strategy || ''
    },
    palette: [
      { hex: '#F5F0E8', label: 'Ivory', role: 'base', usage: 'Foundation neutral for versatility' },
      { hex: '#E8DCC8', label: 'Warm Sand', role: 'base', usage: 'Soft contrast against deeper tones' },
      { hex: '#C8B89A', label: 'Tan', role: 'mid', usage: 'Transitional piece connector' },
      { hex: '#8B7355', label: 'Camel', role: 'mid', usage: 'Sophisticated warmth in outerwear' },
      { hex: '#3D3D3D', label: 'Charcoal', role: 'anchor', usage: 'Professional depth and authority' },
      { hex: '#1A1A1A', label: 'Ink', role: 'anchor', usage: 'Ultimate foundation for formal wear' }
    ],
    palette_avoid: ['Neon colors', 'Saturated red and pink', 'Icy pastels'],
    body_harmony: {
      shape: 'Inverted Triangle',
      objective: (old.body_harmony || '').substring(0, 100),
      principles: [
        'Fitted through chest and shoulders',
        'Tapered trousers',
        'Short sleeves work well',
        'Avoid boxy tops',
        'Textured lower body adds balance'
      ],
      avoid: ['Oversized silhouettes', 'Padded shoulders', 'Wide-leg trousers']
    },
    capsule: {
      tops: [],
      bottoms: [],
      outerwear: [],
      footwear: []
    },
    outfits: [],
    grooming: {
      haircut: (old.grooming_advice || '').substring(0, 150),
      shave: 'Maintain clean shave consistently',
      skincare: 'Cleanser, moisturiser with SPF 30+',
      fragrance: 'Woody, clean, or amber-based'
    },
    shopping: [],
    dos: [
      'Invest in fit above all else',
      'Dress one level up for business',
      'Keep palette consistent',
      'Quality over quantity',
      'Let accessories do the work'
    ],
    donts: [
      'Oversized silhouettes',
      'Loud logos on upper body',
      'Mismatched textures',
      'Cheap footwear',
      'Ignoring fit for trend'
    ],
    closing_message: old.confidence_message || ''
  };
}

function getSafeDefault() {
  return {
    meta: {
      client_name: '',
      archetype_primary: 'Classic Minimalist',
      archetype_secondary: 'Effortless Natural',
      archetype_description: 'A refined approach to personal style emphasizing quality and timeless elegance.',
      style_words: ['Confident', 'Bold', 'Powerful', 'Clean', 'Structured']
    },
    style_identity: {
      overview: '',
      lifestyle_strategy: ''
    },
    palette: [
      { hex: '#F5F0E8', label: 'Ivory', role: 'base', usage: 'Foundation neutral for versatility' },
      { hex: '#E8DCC8', label: 'Warm Sand', role: 'base', usage: 'Soft contrast against deeper tones' },
      { hex: '#C8B89A', label: 'Tan', role: 'mid', usage: 'Transitional piece connector' },
      { hex: '#8B7355', label: 'Camel', role: 'mid', usage: 'Sophisticated warmth in outerwear' },
      { hex: '#3D3D3D', label: 'Charcoal', role: 'anchor', usage: 'Professional depth and authority' },
      { hex: '#1A1A1A', label: 'Ink', role: 'anchor', usage: 'Ultimate foundation for formal wear' }
    ],
    palette_avoid: ['Neon colors', 'Saturated red and pink', 'Icy pastels'],
    body_harmony: {
      shape: 'Inverted Triangle',
      objective: 'Create balanced proportions through strategic fit choices',
      principles: [
        'Fitted through chest and shoulders',
        'Tapered trousers',
        'Short sleeves work well',
        'Avoid boxy tops',
        'Textured lower body adds balance'
      ],
      avoid: ['Oversized silhouettes', 'Padded shoulders', 'Wide-leg trousers']
    },
    capsule: {
      tops: [],
      bottoms: [],
      outerwear: [],
      footwear: []
    },
    outfits: [],
    grooming: {
      haircut: '',
      shave: 'Maintain clean shave consistently',
      skincare: 'Cleanser, moisturiser with SPF 30+',
      fragrance: 'Woody, clean, or amber-based'
    },
    shopping: [],
    dos: [
      'Invest in fit above all else',
      'Dress one level up for business',
      'Keep palette consistent',
      'Quality over quantity',
      'Let accessories do the work'
    ],
    donts: [
      'Oversized silhouettes',
      'Loud logos on upper body',
      'Mismatched textures',
      'Cheap footwear',
      'Ignoring fit for trend'
    ],
    closing_message: ''
  };
}

export default normalizeReport;
