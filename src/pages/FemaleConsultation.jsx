import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'
import { FEMALE_SECTIONS } from '../config/consultationSections'
import { FEMALE_SECTION_QUESTIONS } from '../config/femaleConsultationQuestions'
import { FEMALE_BODY_ARCHITECTURE_QUESTIONS } from '../config/femaleBodyArchitectureQuestions'
import BodyArchitectureQuestionnaire from '../components/BodyArchitectureQuestionnaire'
import SectionQuestionnaire from '../components/SectionQuestionnaire'
import { getClientPhotoUrl, uploadClientPhoto } from '../lib/storage'

export default function FemaleConsultation() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [consultation, setConsultation] = useState({
    identity_lifestyle: {},
    body_architecture: {},
    face_grooming: {},
    color_intelligence: {},
    personal_style: {},
    wardrobe_audit: {},
    transformation_goals: {},
    stylist_notes: '',
  })
  const [activeSectionKey, setActiveSectionKey] = useState(
    FEMALE_SECTIONS[0]?.key ?? 'identity_lifestyle'
  )
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')

  const photoUrl = client?.photo_path ? getClientPhotoUrl(client.photo_path) : null

  useEffect(() => {
    if (!clientId) return
    if (authLoading) return
    if (!user) return

    async function load() {
      setLoading(true)
      setError('')

      // Load client basics (for header, photo, gender guard)
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (clientError || !clientData) {
        setError('Client not found or access denied.')
        setLoading(false)
        return
      }

      // Guard: this page is only for female clients
      if (clientData.gender !== 'Female') {
        setError('This consultation is only available for female clients.')
        setLoading(false)
        return
      }

      setClient(clientData)

      // Load or init consultation row from consultations table
      const { data: consultationRow, error: consultationError } = await supabase
        .from('consultations')
        .select(
          'identity_lifestyle, body_architecture, face_grooming, color_intelligence, personal_style, wardrobe_audit, transformation_goals, stylist_notes'
        )
        .eq('client_id', clientId)
        .maybeSingle()

      if (consultationError) {
        setError('Failed to load consultation.')
        setLoading(false)
        return
      }

      const base = {
        identity_lifestyle:
          (consultationRow?.identity_lifestyle &&
            typeof consultationRow.identity_lifestyle === 'object' &&
            consultationRow.identity_lifestyle !== null &&
            !Array.isArray(consultationRow.identity_lifestyle)
            ? consultationRow.identity_lifestyle
            : {}) || {},
        body_architecture:
          (consultationRow?.body_architecture &&
            typeof consultationRow.body_architecture === 'object' &&
            consultationRow.body_architecture !== null &&
            !Array.isArray(consultationRow.body_architecture)
            ? consultationRow.body_architecture
            : {}) || {},
        face_grooming:
          (consultationRow?.face_grooming &&
            typeof consultationRow.face_grooming === 'object' &&
            consultationRow.face_grooming !== null &&
            !Array.isArray(consultationRow.face_grooming)
            ? consultationRow.face_grooming
            : {}) || {},
        color_intelligence:
          (consultationRow?.color_intelligence &&
            typeof consultationRow.color_intelligence === 'object' &&
            consultationRow.color_intelligence !== null &&
            !Array.isArray(consultationRow.color_intelligence)
            ? consultationRow.color_intelligence
            : {}) || {},
        personal_style:
          (consultationRow?.personal_style &&
            typeof consultationRow.personal_style === 'object' &&
            consultationRow.personal_style !== null &&
            !Array.isArray(consultationRow.personal_style)
            ? consultationRow.personal_style
            : {}) || {},
        wardrobe_audit:
          (consultationRow?.wardrobe_audit &&
            typeof consultationRow.wardrobe_audit === 'object' &&
            consultationRow.wardrobe_audit !== null &&
            !Array.isArray(consultationRow.wardrobe_audit)
            ? consultationRow.wardrobe_audit
            : {}) || {},
        transformation_goals:
          (consultationRow?.transformation_goals &&
            typeof consultationRow.transformation_goals === 'object' &&
            consultationRow.transformation_goals !== null &&
            !Array.isArray(consultationRow.transformation_goals)
            ? consultationRow.transformation_goals
            : {}) || {},
        stylist_notes:
          typeof consultationRow?.stylist_notes === 'string'
            ? consultationRow.stylist_notes
            : '',
      }

      setConsultation(base)
      setActiveSectionKey(FEMALE_SECTIONS[0]?.key ?? 'identity_lifestyle')
      setLoading(false)
    }

    load()
  }, [clientId, user, authLoading])

  const saveSection = useCallback(
    async (sectionKey, sectionValue) => {
      if (!clientId || !user) return
      setSaving(true)

      const payload =
        sectionKey === 'stylist_notes'
          ? { client_id: clientId, user_id: user.id, stylist_notes: sectionValue ?? '' }
          : { client_id: clientId, user_id: user.id, [sectionKey]: sectionValue || {} }

      const { error: upsertError } = await supabase
        .from('consultations')
        .upsert(payload, { onConflict: 'client_id' })

      if (upsertError) {
        setError('Failed to save consultation.')
      }
      setSaving(false)
    },
    [clientId, user]
  )

  const handleQuestionSelect = useCallback(
    (sectionKey) =>
      (questionKey, value) => {
        setConsultation((prev) => {
          const currentSection =
            prev && typeof prev[sectionKey] === 'object' && prev[sectionKey] !== null
              ? prev[sectionKey]
              : {}
          const nextSection = { ...currentSection, [questionKey]: value }
          const next = { ...prev, [sectionKey]: nextSection }
          // Fire-and-forget save; errors are surfaced via state
          saveSection(sectionKey, nextSection)
          return next
        })
      },
    [saveSection]
  )

  const handleBodyArchitectureSelect = useCallback(
    (field, optionValue) => {
      setConsultation((prev) => {
        const current = prev?.body_architecture && typeof prev.body_architecture === 'object'
          ? prev.body_architecture
          : {}
        const nextSection = { ...current, [field]: optionValue }
        const next = { ...prev, body_architecture: nextSection }
        saveSection('body_architecture', nextSection)
        return next
      })
    },
    [saveSection]
  )

  const handleStylistNotesChange = (value) => {
    setConsultation((prev) => ({ ...prev, stylist_notes: value }))
  }

  const handleStylistNotesBlur = () => {
    saveSection('stylist_notes', consultation.stylist_notes ?? '')
  }

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
      return
    }
    const { error: updateErr } = await supabase
      .from('clients')
      .update({ photo_path: result.path })
      .eq('id', clientId)
    if (updateErr) {
      setPhotoError('Save failed. Try again.')
    } else {
      setClient((prev) => (prev ? { ...prev, photo_path: result.path } : null))
    }
    setPhotoUploading(false)
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

  const activeSection =
    FEMALE_SECTIONS.find((s) => s.key === activeSectionKey) ?? FEMALE_SECTIONS[0]

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
            <span className="text-charcoal/40">/</span>
            <span className="text-sm tracking-[0.15em] text-black">
              {client?.name} · Female Consultation
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-charcoal/20 px-4 py-2 text-xs tracking-[0.18em] uppercase bg-white/80 hover:bg-charcoal/5 transition text-charcoal"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className="w-56 shrink-0 border-r border-black/8 bg-white/60 flex flex-col py-8">
          <div className="px-4 mb-8">
            <input
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
                onClick={() => document.querySelector('input[type="file"]')?.click()}
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
            {FEMALE_SECTIONS.map((section) => (
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

              {activeSection.key === 'body_architecture' ? (
                <BodyArchitectureQuestionnaire
                  value={consultation.body_architecture || {}}
                  onSelect={handleBodyArchitectureSelect}
                  saving={saving}
                  questions={FEMALE_BODY_ARCHITECTURE_QUESTIONS}
                />
              ) : activeSection.key === 'stylist_observations' ? (
                <div className="space-y-4">
                  <p className="text-[11px] text-charcoal/60 mb-2">
                    Use this space for overall observations, visible posture notes,
                    proportion imbalances, and key focus areas.
                  </p>
                  <textarea
                    value={consultation.stylist_notes ?? ''}
                    onChange={(e) => handleStylistNotesChange(e.target.value)}
                    onBlur={handleStylistNotesBlur}
                    rows={10}
                    className="w-full rounded-xl bg-cream border border-black/10 px-4 py-3 text-sm text-black placeholder:text-charcoal/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition resize-none"
                    placeholder={
                      'Stylist observations…\n\nPosture notes:\nProportion imbalances:\nRecommended focus areas:'
                    }
                  />
                </div>
              ) : activeSection.key === 'generate_blueprint' ? (
                <div className="space-y-4">
                  <p className="text-[11px] text-charcoal/60 mb-4">
                    This blueprint will compile all sections into a single strategic
                    style plan. AI generation coming soon.
                  </p>
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-gold px-4 py-2 text-xs tracking-[0.15em] uppercase text-charcoal bg-gold/5 cursor-not-allowed"
                  >
                    Generate with AI (coming soon)
                  </button>
                  <textarea
                    rows={12}
                    className="w-full mt-4 rounded-xl bg-cream border border-black/10 px-4 py-3 text-sm text-black placeholder:text-charcoal/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition resize-none"
                    placeholder="Generated blueprint summary will appear here…"
                    readOnly
                  />
                </div>
              ) : (
                <SectionQuestionnaire
                  questions={FEMALE_SECTION_QUESTIONS[activeSection.key] || []}
                  value={consultation[activeSection.key] || {}}
                  onSelect={handleQuestionSelect(activeSection.key)}
                  saving={saving}
                />
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-charcoal/50">
                  {saving ? 'Saving…' : 'Saved to consultation'}
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

