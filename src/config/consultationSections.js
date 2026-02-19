/**
 * Sidebar sections for Male vs Female consultation dashboards.
 *
 * key  — matches the property stored inside clients.consultation JSON object
 *        AND must match the keys in MALE_SECTION_QUESTIONS (maleConsultationQuestions.js)
 *        for questionnaire sections, or BodyArchitectureQuestionnaire for body sections.
 */

export const MALE_SECTIONS = [
  { label: 'Body Architecture',     key: 'body_fit_architecture' },
  { label: 'Identity & Lifestyle',  key: 'identity_lifestyle' },
  { label: 'Face & Grooming',       key: 'face_grooming' },
  { label: 'Color Intelligence',    key: 'color_intelligence' },
  { label: 'Personal Style',        key: 'personal_style' },
  { label: 'Wardrobe Audit',        key: 'wardrobe_audit' },
  { label: 'Transformation Goals',  key: 'transformation_goals' },
  { label: 'Stylist Observations',  key: 'stylist_observations' },
  { label: 'Generate Blueprint',    key: 'generate_blueprint' },
]

export const FEMALE_SECTIONS = [
  { label: 'Body Architecture',        key: 'body_architecture' },
  { label: 'Identity & Lifestyle',     key: 'identity_lifestyle' },
  { label: 'Color Analysis',           key: 'color_analysis' },
  { label: 'Face & Makeup Analysis',   key: 'face_makeup_analysis' },
  { label: 'Personal Style Identity',  key: 'personal_style_identity' },
  { label: 'Wardrobe Audit',           key: 'wardrobe_audit' },
  { label: 'Transformation Goals',     key: 'transformation_goals' },
  { label: 'Stylist Observations',     key: 'stylist_observations' },
  { label: 'Generate Blueprint',       key: 'generate_blueprint' },
]

/**
 * Section keys that use the BodyArchitectureQuestionnaire component.
 * All others use SectionQuestionnaire (from MALE_SECTION_QUESTIONS) or plain textarea.
 */
export const BODY_ARCHITECTURE_KEYS = new Set([
  'body_fit_architecture',
  'body_architecture',
])

/**
 * Section keys that are plain text areas (not structured questionnaires).
 */
export const PLAIN_TEXT_KEYS = new Set([
  'stylist_observations',
  'generate_blueprint',
])
