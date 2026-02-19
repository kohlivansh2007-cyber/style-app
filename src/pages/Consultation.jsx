import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'
import { MALE_SECTIONS, FEMALE_SECTIONS } from '../config/consultationSections'
import { getClientPhotoUrl, uploadClientPhoto } from '../lib/storage'
import BodyArchitectureQuestionnaire from '../components/BodyArchitectureQuestionnaire'
import SectionQuestionnaire from '../components/SectionQuestionnaire'
import { MALE_SECTION_QUESTIONS } from '../config/maleConsultationQuestions'

const SECTION_COLUMN_MAP = {
  identity_lifestyle: 'identity_lifestyle',
  body_architecture: 'body_architecture',
  body_fit_architecture: 'body_fit_architecture',
  face_grooming: 'face_grooming',
  color_intelligence: 'color_intelligence',
  personal_style: 'personal_style',
  wardrobe_audit: 'wardrobe_audit',
  transformation_goals: 'transformation_goals',
  stylist_observations: 'stylist_notes',
  generate_blueprint: 'generate_blueprint',
}

const CONSULTATION_SELECT_COLUMNS = `
  client_id,
  identity_lifestyle,
  body_architecture,
  body_fit_architecture,
  face_grooming,
  color_intelligence,
  personal_style,
  wardrobe_audit,
  transformation_goals,
  stylist_notes,
  generate_blueprint
`

function objectOrEmpty(value) {
  return typeof value === 'object' && value !== null ? value : {}
}

function buildConsultationState(record) {
  if (!record) return {}

  return {
    identity_lifestyle: objectOrEmpty(record.identity_lifestyle),
    body_architecture: objectOrEmpty(record.body_architecture),
    body_fit_architecture: objectOrEmpty(record.body_fit_architecture),
    face_grooming: objectOrEmpty(record.face_grooming),
    color_intelligence: objectOrEmpty(record.color_intelligence),
    personal_style: objectOrEmpty(record.personal_style),
    wardrobe_audit: objectOrEmpty(record.wardrobe_audit),
    transformation_goals: objectOrEmpty(record.transformation_goals),
    stylist_observations: { stylist_notes: record.stylist_notes ?? '' },
    generate_blueprint: record.generate_blueprint ?? '',
  }
}

export default function Consultation() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [consultation, setConsultation] = useState({})
  const [activeSectionKey, setActiveSectionKey] = useState(null)
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const photoInputRef = useRef(null)

  const photoUrl = client?.photo_path ? getClientPhotoUrl(client.photo_path) : null

  const sections =
    client?.gender === 'Female' ? FEMALE_SECTIONS : MALE_SECTIONS
  const activeSection = sections.find((s) => s.key === activeSectionKey) ?? sections[0]

  useEffect(() => {
    if (!clientId || !user) return

    async function load() {
      setLoading(true)
      setError('')

      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('stylist_id', user.id)
        .single()

      if (fetchError || !data) {
        setError('Client not found or access denied.')
        setLoading(false)
        return
      }

      setClient(data)

      const { data: consultationRecord, error: consultationError } = await supabase
        .from('consultations')
        .select(CONSULTATION_SELECT_COLUMNS)
        .eq('client_id', clientId)
        .maybeSingle()

      if (consultationError) {
        setError('Failed to load consultation data.')
      }

      setConsultation(buildConsultationState(consultationRecord))
      const firstKey = data.gender === 'Female' ? FEMALE_SECTIONS[0].key : MALE_SECTIONS[0].key
      setActiveSectionKey(firstKey)
      setLoading(false)
    }

    load()
  }, [clientId, user])

  const saveSection = useCallback(
    async (sectionKey, value) => {
      if (!clientId) return
      const column = SECTION_COLUMN_MAP[sectionKey]
      if (!column) return

      setSaving(true)
      const { error: upsertError } = await supabase
        .from('consultations')
        .upsert({ client_id: clientId, [column]: value }, { onConflict: 'client_id' })

      if (upsertError) setError('Failed to save.')
      setSaving(false)
    },
    [clientId]
  )

  const handleSectionSelect = useCallback(
    (sectionKey, field, optionValue) => {
      setConsultation((prev) => {
        const current = objectOrEmpty(prev[sectionKey])
        const nextSection = { ...current, [field]: optionValue }
        saveSection(sectionKey, nextSection)
        return { ...prev, [sectionKey]: nextSection }
      })
    },
    [saveSection]
  )

  const handleGenerateBlueprintChange = useCallback(
    (value) => {
      setConsultation((prev) => ({ ...prev, generate_blueprint: value }))
      saveSection('generate_blueprint', value)
    },
    [saveSection]
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user || !clientId) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.')
      return
    }
    setPhotoError('')
    setPhotoUploading(true)
    const result = await uploadClientPhoto(user.id, clientId, file)
    if (result.error) {
      setPhotoError('Upload failed. Try again.')
      setPhotoUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
      return
    }
    const { error: updateErr } = await supabase
      .from('clients')
      .update({ photo_path: result.path })
      .eq('id', clientId)
      .eq('stylist_id', user.id)
    if (updateErr) {
      setPhotoError('Save failed. Try again.')
    } else {
      setClient((prev) => (prev ? { ...prev, photo_path: result.path } : null))
    }
    setPhotoUploading(false)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center text-black">
        <p className="text-xs tracking-[0.3em] uppercase text-charcoal/60">
          Loading consultation…
        </p>
      </div>
    )
  }

  if (error && !client) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center text-black px-6">
        <p className="text-sm text-red-700 mb-4">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-lg border border-charcoal/20 px-4 py-2 text-xs tracking-[0.18em] uppercase bg-white hover:bg-charcoal/5 transition"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream text-black flex flex-col">
      <header className="border-b border-black/10 bg-cream/95 backdrop-blur-sm shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-lg border border-black/15 px-3 py-1.5 text-[11px] tracking-[0.2em] uppercase bg-white/80 hover:bg-charcoal/5 transition text-charcoal"
            >
              Dashboard
            </button>
            <div>
              <h1 className="text-sm tracking-[0.24em] uppercase text-charcoal">
                Consultation Workspace
              </h1>
              <p className="text-[10px] tracking-[0.22em] uppercase text-charcoal/55 mt-0.5">
                {client?.name} • {client?.gender}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-black/15 px-3 py-1.5 text-[11px] tracking-[0.2em] uppercase bg-white/80 hover:bg-charcoal/5 transition text-charcoal"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-56 shrink-0 border-r border-black/8 bg-white/60 flex flex-col py-8">
          <div className="px-4 mb-8">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handlePhotoChange}
              className="sr-only"
              aria-label="Upload or change client photo"
            />
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full border border-black/10 bg-cream flex items-center justify-center overflow-hidden shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={client?.name ?? 'Client'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[9px] tracking-widest uppercase text-charcoal/40 text-center px-1">
                    No photo
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="text-[10px] tracking-[0.2em] uppercase text-charcoal/70 hover:text-charcoal transition disabled:opacity-50"
              >
                {photoUploading ? 'Uploading…' : photoUrl ? 'Change photo' : 'Upload photo'}
              </button>
              {photoError && (
                <p className="text-[10px] text-red-600 text-center">{photoError}</p>
              )}
            </div>
          </div>
          <p className="px-4 text-[10px] tracking-[0.28em] uppercase text-charcoal/50 mb-4">
            Sections
          </p>
          <nav className="flex flex-col gap-1">
            {sections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSectionKey(section.key)}
                className={`text-left px-4 py-3 text-[11px] tracking-[0.14em] uppercase transition rounded-r-lg ${
                  activeSectionKey === section.key
                    ? 'bg-charcoal/8 text-black border-l-2 border-charcoal'
                    : 'text-charcoal/60 hover:bg-black/[0.04] hover:text-charcoal border-l-2 border-transparent'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="border border-black/8 rounded-2xl bg-white/80 p-8 md:p-10 shadow-sm">
              <h2 className="text-sm tracking-[0.22em] uppercase text-charcoal mb-2">
                {activeSection.label}
              </h2>

              {activeSection.key === 'body_architecture' ||
                activeSection.key === 'body_fit_architecture' ? (
                <BodyArchitectureQuestionnaire
                  value={consultation[activeSection.key] || {}}
                  onSelect={(field, optionValue) =>
                    handleSectionSelect(activeSection.key, field, optionValue)
                  }
                  saving={saving}
                />
              ) : MALE_SECTION_QUESTIONS[activeSection.key] ? (
                <SectionQuestionnaire
                  questions={MALE_SECTION_QUESTIONS[activeSection.key]}
                  value={consultation[activeSection.key] || {}}
                  onSelect={(field, optionValue) =>
                    handleSectionSelect(activeSection.key, field, optionValue)
                  }
                  saving={saving}
                />
              ) : activeSection.key === 'generate_blueprint' ? (
                <div className="space-y-4">
                  <p className="text-[11px] text-charcoal/60 mb-4">
                    Notes and findings for this section are saved automatically
                    to this client.
                  </p>
                  <p className="text-sm text-charcoal/70">
                    Compile all sections into a single blueprint view. Use this
                    area for final summary, recommendations, or exported
                    blueprint text.
                  </p>
                  <textarea
                    value={consultation.generate_blueprint ?? ''}
                    onChange={(e) => handleGenerateBlueprintChange(e.target.value)}
                    rows={12}
                    className="w-full rounded-xl bg-cream border border-black/10 px-4 py-3 text-sm text-black placeholder:text-charcoal/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition resize-none"
                    placeholder="Blueprint summary…"
                  />
                </div>
              ) : (
                <>
                  <p className="text-[11px] text-charcoal/60 mb-4">
                    Notes and findings for this section are saved automatically
                    to this client.
                  </p>
                  <textarea
                    value={consultation[activeSection.key] ?? ''}
                    onChange={(e) =>
                      setConsultation((prev) => ({
                        ...prev,
                        [activeSection.key]: e.target.value,
                      }))
                    }
                    onBlur={(e) => saveSection(activeSection.key, e.target.value)}
                    rows={14}
                    className="w-full rounded-xl bg-cream border border-black/10 px-4 py-3 text-sm text-black placeholder:text-charcoal/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition resize-none"
                    placeholder="Add notes for this section…"
                  />
                </>
              )}

              {activeSection.key !== 'body_architecture' &&
                activeSection.key !== 'body_fit_architecture' && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-charcoal/50">
                    {saving ? 'Saving…' : 'Saved to client'}
                  </span>
                  <button
                    type="button"
                    onClick={() => saveSection(activeSection.key, consultation[activeSection.key])}
                    disabled={saving}
                    className="rounded-lg border border-gold px-4 py-2 text-xs tracking-[0.15em] uppercase text-charcoal hover:bg-gold/10 transition disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save now'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
