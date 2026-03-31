/**
 * Sidebar sections for Male vs Female consultation dashboards.
 *
 * key  — matches the property stored inside clients.consultation JSON object
 *        AND must match the keys in MALE_SECTION_QUESTIONS (maleConsultationQuestions.js)
 *        for questionnaire sections, or BodyArchitectureQuestionnaire for body sections.
 */

export const MALE_SECTIONS = [
  { label: 'Identity & Life Stage',  key: 'identity' },
  { label: 'Lifestyle Alignment',    key: 'lifestyle' },
  { label: 'Personal Color Analysis', key: 'colorAnalysis' },
  { label: 'Body Harmony',           key: 'bodyHarmony' },
  { label: 'Style Archetype',        key: 'styleArchetype' },
  { label: 'Wardrobe Audit',         key: 'wardrobeAudit' },
  { label: 'Style Goals',            key: 'styleGoals' },
  { label: 'Grooming',               key: 'grooming' },
  { label: 'Stylist Notes',          key: 'stylistNotes' },
]

export const FEMALE_SECTIONS = [
  { label: 'Identity & Life Stage',  key: 'identity' },
  { label: 'Lifestyle Alignment',    key: 'lifestyle' },
  { label: 'Personal Color Analysis', key: 'colorAnalysis' },
  { label: 'Body Harmony',           key: 'bodyHarmony' },
  { label: 'Style Archetype',        key: 'styleArchetype' },
  { label: 'Wardrobe Audit',         key: 'wardrobeAudit' },
  { label: 'Style Goals',            key: 'styleGoals' },
  { label: 'Grooming',               key: 'grooming' },
  { label: 'Stylist Notes',          key: 'stylistNotes' },
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
