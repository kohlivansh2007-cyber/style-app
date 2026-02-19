/**
 * All male consultation section questions.
 * Each section key maps to an array of question configs.
 *
 * Question types:
 *   'single' — one option selectable at a time
 *   'multi'  — multiple options selectable (selecting 'None' clears others)
 *   'text'   — free-text input stored as a string
 *
 * These are stored inside clients.consultation[sectionKey][questionKey]
 * Body Architecture (body_fit_architecture) is handled separately via BodyArchitectureQuestionnaire.
 */

export const MALE_SECTION_QUESTIONS = {
  // ─── Section 1: Identity & Lifestyle ───────────────────────────────────────
  identity_lifestyle: [
    {
      key: 'age',
      label: 'Age',
      type: 'single',
      options: ['Under 18', '18–24', '25–34', '35–44', '45–54', '55+'],
    },
    {
      key: 'profession',
      label: 'Profession',
      type: 'single',
      options: [
        'Corporate',
        'Business owner',
        'Creative',
        'Student',
        'Public figure',
        'Other',
      ],
    },
    {
      key: 'income_level',
      label: 'Income level',
      type: 'single',
      options: ['Budget conscious', 'Mid-range', 'Premium', 'Luxury'],
    },
    {
      key: 'work_environment',
      label: 'Work environment',
      type: 'single',
      options: [
        'Formal office',
        'Business casual',
        'Creative',
        'Remote',
        'Mixed',
      ],
    },
    {
      key: 'social_frequency',
      label: 'Social frequency',
      type: 'single',
      options: ['Rare', 'Occasional', 'Active', 'Very active'],
    },
    {
      key: 'public_visibility',
      label: 'Public visibility',
      type: 'single',
      options: ['Low', 'Medium', 'High', 'Very high'],
    },
  ],

  // ─── Section 3: Face & Grooming ─────────────────────────────────────────────
  face_grooming: [
    {
      key: 'face_shape',
      label: 'Face shape',
      type: 'single',
      options: ['Oval', 'Round', 'Square', 'Rectangle', 'Diamond', 'Unsure'],
    },
    {
      key: 'jawline',
      label: 'Jawline',
      type: 'single',
      options: ['Sharp', 'Average', 'Soft'],
    },
    {
      key: 'hair_type',
      label: 'Hair type',
      type: 'single',
      options: ['Straight', 'Wavy', 'Curly', 'Thinning', 'Balding'],
    },
    {
      key: 'hair_concerns',
      label: 'Hair concerns',
      type: 'multi',
      options: ['Hair fall', 'Receding hairline', 'Grey hair', 'None'],
    },
    {
      key: 'facial_hair',
      label: 'Facial hair',
      type: 'single',
      options: ['Clean shave', 'Stubble', 'Full beard', 'Patchy beard'],
    },
    {
      key: 'grooming_effort',
      label: 'Grooming effort',
      type: 'single',
      options: ['High', 'Medium', 'Minimal'],
    },
    {
      key: 'eyewear',
      label: 'Eyewear',
      type: 'single',
      options: ['None', 'Glasses', 'Need better frames'],
    },
  ],

  // ─── Section 4: Color Intelligence ──────────────────────────────────────────
  color_intelligence: [
    {
      key: 'skin_undertone',
      label: 'Skin undertone',
      type: 'single',
      options: ['Warm', 'Cool', 'Neutral', 'Unsure'],
    },
    {
      key: 'contrast',
      label: 'Contrast',
      type: 'single',
      options: ['High', 'Medium', 'Low', 'Unsure'],
    },
    {
      key: 'color_confidence',
      label: 'Color confidence',
      type: 'single',
      options: ['Know what suits me', 'Somewhat know', 'No idea'],
    },
    {
      key: 'metal',
      label: 'Metal preference',
      type: 'single',
      options: ['Gold', 'Silver', 'Mixed', 'None'],
    },
  ],

  // ─── Section 5: Personal Style ───────────────────────────────────────────────
  personal_style: [
    {
      key: 'current_style',
      label: 'Current style',
      type: 'single',
      options: [
        'Basic',
        'Casual',
        'Smart casual',
        'Formal',
        'Streetwear',
        'Mixed',
      ],
    },
    {
      key: 'style_satisfaction',
      label: 'Style satisfaction',
      type: 'single',
      options: ['Very satisfied', 'Somewhat satisfied', 'Not satisfied'],
    },
    {
      key: 'aspirational_style',
      label: 'Aspirational style',
      type: 'single',
      options: [
        'Elegant',
        'Powerful',
        'Minimal',
        'Trendy',
        'Classic',
        'Masculine sharp',
      ],
    },
    {
      key: 'style_inspiration',
      label: 'Style inspiration',
      type: 'text',
      placeholder: 'Celebrities, characters, or images that inspire…',
    },
    {
      key: 'brands_worn',
      label: 'Brands worn',
      type: 'text',
      placeholder: 'Current or aspirational brands…',
    },
  ],

  // ─── Section 6: Wardrobe Audit ───────────────────────────────────────────────
  wardrobe_audit: [
    {
      key: 'wardrobe_issues',
      label: 'Wardrobe issues',
      type: 'multi',
      options: [
        'Poor fit',
        'Outdated clothes',
        'Random shopping',
        'No versatility',
        'Too many clothes',
        'Too few clothes',
      ],
    },
    {
      key: 'shopping_habit',
      label: 'Shopping habit',
      type: 'single',
      options: ['Rare', 'Random', 'Intentional', 'Luxury'],
    },
    {
      key: 'upcoming_events',
      label: 'Upcoming events',
      type: 'text',
      placeholder: 'Weddings, launches, trips, interviews…',
    },
  ],

  // ─── Section 7: Transformation Goals ────────────────────────────────────────
  transformation_goals: [
    {
      key: 'primary_goal',
      label: 'Primary goal',
      type: 'single',
      options: [
        'Look powerful',
        'Look attractive',
        'Professional upgrade',
        'Full transformation',
        'Dating confidence',
        'Simplify wardrobe',
      ],
    },
    {
      key: 'perception_goal',
      label: 'How I want to be perceived',
      type: 'single',
      options: [
        'Powerful',
        'Attractive',
        'Elegant',
        'Dominant',
        'Approachable',
        'High status',
      ],
    },
    {
      key: 'urgency',
      label: 'Urgency',
      type: 'single',
      options: ['Immediate', '1–3 months', 'No timeline'],
    },
  ],

  // ─── Section 8: Stylist Observations ───────────────────────────────────────
  stylist_observations: [
    {
      key: 'stylist_notes',
      label: 'Stylist notes',
      type: 'text',
      placeholder: 'Professional observations, recommendations, and key notes…',
    },
  ],

}
