/**
 * Body Architecture questionnaire — Male (single + multi-select).
 * Stored under client.consultation.body_fit_architecture
 * Female equivalent uses body_architecture key (kept for future).
 */

export const BODY_ARCHITECTURE_QUESTIONS = [
  {
    key: 'height_range',
    label: 'Height',
    options: ["Under 5'6", "5'6–5'9", "5'9–6'", "6'+"],
    multiSelect: false,
  },
  {
    key: 'body_type',
    label: 'Body type',
    options: ['Slim', 'Athletic', 'Average', 'Muscular', 'Heavy'],
    multiSelect: false,
  },
  {
    key: 'body_shape',
    label: 'Body shape',
    options: [
      'Rectangle',
      'Triangle',
      'Inverted triangle',
      'Oval',
      'Trapezoid',
    ],
    multiSelect: false,
  },
  {
    key: 'concern_areas',
    label: 'Main concern areas',
    options: [
      'Belly',
      'Chest',
      'Arms',
      'Shoulders',
      'Legs',
      'Posture',
      'None',
    ],
    multiSelect: true,
  },
  {
    key: 'fit_preference',
    label: 'Fit preference',
    options: ['Slim', 'Tailored', 'Regular', 'Relaxed', 'Oversized'],
    multiSelect: false,
  },
  {
    key: 'confidence_level',
    label: 'Confidence level in body',
    options: [
      'Very confident',
      'Confident',
      'Neutral',
      'Insecure',
      'Very insecure',
    ],
    multiSelect: false,
  },
]
