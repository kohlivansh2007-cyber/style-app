export const FEMALE_SECTION_QUESTIONS = {
  // 1. Identity & Lifestyle
  identity_lifestyle: [
    {
      key: 'primary_lifestyle',
      label: 'Primary lifestyle',
      type: 'single',
      options: [
        'Corporate',
        'Creative',
        'Student',
        'Entrepreneur',
        'Homemaker',
        'Influencer',
        'Mixed',
      ],
    },
    {
      key: 'social_exposure_level',
      label: 'Social exposure level',
      type: 'single',
      options: ['Low', 'Moderate', 'High', 'Public-facing'],
    },
    {
      key: 'personal_brand_keywords',
      label: 'Personal brand keywords',
      type: 'multi',
      options: [
        'Elegant',
        'Bold',
        'Minimal',
        'Feminine',
        'Powerful',
        'Soft',
        'Structured',
        'Glamorous',
        'Classic',
        'Edgy',
        'Romantic',
      ],
    },
    {
      key: 'fashion_confidence_level',
      label: 'Fashion confidence level',
      type: 'single',
      options: ['Low', 'Medium', 'High'],
    },
    {
      key: 'budget_range',
      label: 'Budget range',
      type: 'single',
      options: ['Low', 'Mid', 'Premium', 'Luxury'],
    },
  ],

  // 3. Face & Grooming
  face_grooming: [
    {
      key: 'face_shape',
      label: 'Face shape',
      type: 'single',
      options: ['Oval', 'Round', 'Square', 'Heart', 'Diamond', 'Oblong'],
    },
    {
      key: 'skin_undertone',
      label: 'Skin undertone',
      type: 'single',
      options: ['Warm', 'Cool', 'Neutral', 'Olive'],
    },
    {
      key: 'hair_type',
      label: 'Hair type',
      type: 'single',
      options: ['Straight', 'Wavy', 'Curly', 'Coily'],
    },
    {
      key: 'hair_density',
      label: 'Hair density',
      type: 'single',
      options: ['Thin', 'Medium', 'Thick'],
    },
    {
      key: 'current_hair_length',
      label: 'Current hair length',
      type: 'single',
      options: ['Short', 'Medium', 'Long'],
    },
    {
      key: 'makeup_frequency',
      label: 'Makeup frequency',
      type: 'single',
      options: ['Rare', 'Occasional', 'Daily', 'Glam events'],
    },
    {
      key: 'grooming_priority',
      label: 'Grooming priority',
      type: 'single',
      options: ['Natural', 'Polished', 'Glamorous', 'High-fashion'],
    },
  ],

  // 4. Color Intelligence
  color_intelligence: [
    {
      key: 'jewelry_preference',
      label: 'Jewelry preference',
      type: 'single',
      options: ['Gold', 'Silver', 'Mixed'],
    },
    {
      key: 'preferred_clothing_colors',
      label: 'Preferred clothing colors',
      type: 'multi',
      options: [
        'Neutrals',
        'Pastels',
        'Jewel tones',
        'Earth tones',
        'Brights',
        'Monochrome',
      ],
    },
    {
      key: 'avoided_colors',
      label: 'Avoided colors',
      type: 'text',
      placeholder: 'Colors the client dislikes or avoids…',
    },
    {
      key: 'contrast_level',
      label: 'Contrast level',
      type: 'single',
      options: ['Low', 'Medium', 'High'],
    },
    {
      key: 'pattern_comfort',
      label: 'Pattern comfort',
      type: 'single',
      options: ['Avoid', 'Subtle', 'Moderate', 'Bold'],
    },
  ],

  // 5. Personal Style
  personal_style: [
    {
      key: 'current_style_description',
      label: 'Current style description',
      type: 'text',
      placeholder: 'Describe how the client currently dresses day-to-day…',
    },
    {
      key: 'style_aspiration',
      label: 'Style aspiration',
      type: 'single',
      options: [
        'Old money',
        'Modern chic',
        'Soft feminine',
        'Power dressing',
        'Minimalist',
        'Glam',
        'Street',
        'Bohemian',
      ],
    },
    {
      key: 'silhouette_preference',
      label: 'Silhouette preference',
      type: 'single',
      options: ['Fitted', 'Relaxed', 'Structured', 'Flowing'],
    },
    {
      key: 'comfort_priority',
      label: 'Comfort priority',
      type: 'single',
      options: ['High', 'Balanced', 'Low'],
    },
    {
      key: 'statement_tolerance',
      label: 'Statement tolerance',
      type: 'single',
      options: ['Minimal', 'Moderate', 'Bold'],
    },
  ],

  // 6. Wardrobe Audit
  wardrobe_audit: [
    {
      key: 'closet_organization',
      label: 'Closet organization',
      type: 'single',
      options: ['Structured', 'Cluttered', 'Mixed'],
    },
    {
      key: 'most_worn_category',
      label: 'Most worn category',
      type: 'single',
      options: ['Dresses', 'Trousers', 'Denim', 'Skirts', 'Athleisure'],
    },
    {
      key: 'fit_issues',
      label: 'Fit issues',
      type: 'multi',
      options: ['Waist gap', 'Tight shoulders', 'Length problems', 'None'],
    },
    {
      key: 'footwear_range',
      label: 'Footwear range',
      type: 'single',
      options: ['Limited', 'Moderate', 'Extensive'],
    },
    {
      key: 'accessories_usage',
      label: 'Accessories usage',
      type: 'single',
      options: ['Rare', 'Moderate', 'Heavy'],
    },
  ],

  // 7. Transformation Goals
  transformation_goals: [
    {
      key: 'primary_goal',
      label: 'Primary goal',
      type: 'single',
      options: [
        'Confidence',
        'Image upgrade',
        'Professional authority',
        'Femininity',
        'Modernization',
      ],
    },
    {
      key: 'urgency_level',
      label: 'Urgency level',
      type: 'single',
      options: ['Low', 'Medium', 'High'],
    },
    {
      key: 'occasions_focus',
      label: 'Occasions focus',
      type: 'multi',
      options: ['Work', 'Casual', 'Events', 'Travel', 'Content creation'],
    },
    {
      key: 'long_term_vision',
      label: 'Long-term vision',
      type: 'text',
      placeholder: 'Describe the client’s longer-term image and lifestyle vision…',
    },
  ],
}

