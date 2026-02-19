/**
 * SectionQuestionnaire — generic reusable questionnaire renderer.
 *
 * Props:
 *   questions  — array of question configs from maleConsultationQuestions.js
 *   value      — the current section data object  { questionKey: selectedValue }
 *   onSelect   — (questionKey, newValue) => void   called on every change
 *   saving     — boolean, shows saving indicator
 *
 * Question types supported:
 *   'single' — one option active at a time (radio-style buttons)
 *   'multi'  — multiple options selectable; 'None' option clears all others
 *   'text'   — free-text textarea, fires onSelect on blur
 */
export default function SectionQuestionnaire({
  questions = [],
  value = {},
  onSelect,
  saving = false,
}) {
  const data = typeof value === 'object' && value !== null ? value : {}

  // ── Single-select click ────────────────────────────────────────────────────
  const handleSingleClick = (questionKey, option) => {
    onSelect(questionKey, option)
  }

  // ── Multi-select click ─────────────────────────────────────────────────────
  const handleMultiClick = (questionKey, option) => {
    const current = Array.isArray(data[questionKey]) ? data[questionKey] : []

    if (option === 'None') {
      // 'None' clears all other selections
      onSelect(questionKey, [])
      return
    }

    if (current.includes(option)) {
      // Deselect — also remove 'None' if somehow present
      onSelect(
        questionKey,
        current.filter((item) => item !== option && item !== 'None')
      )
    } else {
      // Select — strip 'None' from array
      const updated = current.filter((item) => item !== 'None')
      onSelect(questionKey, [...updated, option])
    }
  }

  // ── Is an option selected? ─────────────────────────────────────────────────
  const isSelected = (questionKey, option, type) => {
    if (type === 'multi') {
      const current = Array.isArray(data[questionKey]) ? data[questionKey] : []
      if (option === 'None') return current.length === 0
      return current.includes(option)
    }
    return (data[questionKey] ?? '').toString().trim() === option
  }

  return (
    <div className="space-y-8">
      <p className="text-[11px] text-charcoal/60">
        Selections are saved automatically to this client.
      </p>

      {questions.map((q) => {
        // ── Text input ─────────────────────────────────────────────────────
        if (q.type === 'text') {
          return (
            <div key={q.key} className="space-y-2">
              <h3 className="text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                {q.label}
              </h3>
              <textarea
                value={data[q.key] ?? ''}
                onChange={(e) => onSelect(q.key, e.target.value)}
                onBlur={(e) => onSelect(q.key, e.target.value, true)}
                rows={3}
                placeholder={q.placeholder ?? ''}
                className="w-full rounded-xl bg-cream border border-black/10 px-4 py-3 text-sm text-black placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition resize-none"
              />
            </div>
          )
        }

        // ── Single / Multi select ──────────────────────────────────────────
        return (
          <div key={q.key} className="space-y-3">
            <h3 className="text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
              {q.label}
              {q.type === 'multi' && (
                <span className="ml-2 text-[10px] text-charcoal/50 font-normal">
                  (select multiple)
                </span>
              )}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((option) => {
                const selected = isSelected(q.key, option, q.type)
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      q.type === 'multi'
                        ? handleMultiClick(q.key, option)
                        : handleSingleClick(q.key, option)
                    }
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
        )
      })}

      <div className="pt-2 flex items-center">
        <span className="text-[11px] text-charcoal/50">
          {saving ? 'Saving…' : 'Saved to client'}
        </span>
      </div>
    </div>
  )
}
