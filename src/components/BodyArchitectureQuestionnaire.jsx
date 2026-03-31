import { BODY_ARCHITECTURE_QUESTIONS } from '../config/bodyArchitectureQuestions'

export default function BodyArchitectureQuestionnaire({
  value = {},
  onSelect,
  saving = false,
  questions,
}) {
  const data = typeof value === 'object' && value !== null ? value : {}

  const effectiveQuestions =
    Array.isArray(questions) && questions.length > 0
      ? questions
      : BODY_ARCHITECTURE_QUESTIONS

  const handleOptionClick = (questionKey, option, isMultiSelect) => {
    if (isMultiSelect) {
      const current = Array.isArray(data[questionKey]) ? data[questionKey] : []
      if (option === 'None') {
        onSelect(questionKey, [])
      } else if (current.includes(option)) {
        onSelect(
          questionKey,
          current.filter((item) => item !== option && item !== 'None')
        )
      } else {
        const updated = current.filter((item) => item !== 'None')
        onSelect(questionKey, [...updated, option])
      }
    } else {
      onSelect(questionKey, option)
    }
  }

  const isSelected = (questionKey, option, isMultiSelect) => {
    if (isMultiSelect) {
      const current = Array.isArray(data[questionKey]) ? data[questionKey] : []
      return current.includes(option)
    } else {
      return (data[questionKey] || '').trim() === option
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-[11px] text-charcoal/60">
        Selections are saved automatically to this client.
      </p>

      {effectiveQuestions.map((q) => (
        <div key={q.key} className="space-y-3">
          <h3 className="text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
            {q.label}
            {q.multiSelect && (
              <span className="ml-2 text-[10px] text-charcoal/50 font-normal">
                (select multiple)
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {q.options.map((option) => {
              const selected = isSelected(q.key, option, q.multiSelect)
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleOptionClick(q.key, option, q.multiSelect)}
                  className={`text-left rounded-xl border px-4 py-3 text-sm tracking-[0.06em] transition ${
                    selected
                      ? 'border-gold bg-gold/10 text-charcoal shadow-sm'
                      : 'border-black/10 bg-white/80 text-black hover:border-charcoal/30 hover:bg-white'
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div className="pt-2 flex items-center">
        <span className="text-[11px] text-charcoal/50">
          {saving ? 'Saving…' : 'Saved to client'}
        </span>
      </div>
    </div>
  )
}
