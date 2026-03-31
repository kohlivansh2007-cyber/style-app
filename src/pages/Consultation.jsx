import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'
import { MALE_SECTIONS, FEMALE_SECTIONS } from '../config/consultationSections'
import { getClientPhotoUrl, uploadClientPhoto } from '../lib/storage'

const EMPTY_SECTIONS = {
  identity: {},
  lifestyle: {},
  colorAnalysis: {},
  bodyHarmony: {},
  styleArchetype: {},
  wardrobeAudit: {},
  styleGoals: {},
  grooming: {},
  stylistNotes: {},
}

export default function Consultation() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  console.log('Client ID:', clientId)

  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sections, setSections] = useState(EMPTY_SECTIONS)
  const [activeSectionKey, setActiveSectionKey] = useState(null)
  const [saveStatus, setSaveStatus] = useState('') // '' | 'saving' | 'saved'
  const [consultationId, setConsultationId] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [blueprintGenerating, setBlueprintGenerating] = useState(false)
  const [blueprintError, setBlueprintError] = useState('')
  const [blueprintData, setBlueprintData] = useState(null)
  const photoInputRef = useRef(null)
  const lastEditedSectionRef = useRef(null)
  const flushAfterRef = useRef(null) // set to sectionKey for instant save
  const debounceTimerRef = useRef(null)
  const loadedFromDbRef = useRef(false)
  const savedTimerRef = useRef(null)
  const sectionsRef = useRef(sections) // always-current snapshot for visibilitychange

  const photoUrl = client?.photo_path ? getClientPhotoUrl(client.photo_path) : null

  const sidebarSections =
    client?.gender === 'Female' ? FEMALE_SECTIONS : MALE_SECTIONS
  const activeSection =
    sidebarSections.find((s) => s.key === activeSectionKey) ?? sidebarSections[0]

  useEffect(() => {
    if (!clientId) return
    if (authLoading) return
    if (!user) return

    const fetchClient = async () => {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (error || !data) {
        console.error('Client fetch error:', error)
        setError('Client not found or access denied.')
        setLoading(false)
        return
      }

      setClient(data)
      const firstKey =
        data.gender === 'Female' ? FEMALE_SECTIONS[0].key : MALE_SECTIONS[0].key
      setActiveSectionKey(firstKey)
      setLoading(false)
    }

    fetchClient()
  }, [clientId, user, authLoading])

  // Load or initialise consultation sections from consultations table
  useEffect(() => {
    if (!clientId) return
    if (authLoading) return
    if (!user) return
    if (!client) return

    const fetchConsultation = async () => {
      try {
        console.log('[Consultation] Fetching consultation for client:', clientId)
        console.log('[Consultation] User:', user?.id)
        
        const { data, error } = await supabase
          .from('consultations')
          .select('id, sections')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error('[Consultation] Fetch error:', error)
          setSections(EMPTY_SECTIONS)
          setConsultationId(null)
          return
        }

        if (!data) {
          console.log('[Consultation] No consultation found, creating new one...')
          console.log('[Consultation] Inserting with client_id:', clientId, 'user_id:', user?.id)
          
          // First, check if any rows exist and delete them to prevent duplicates
          const { data: existingRows } = await supabase
            .from('consultations')
            .select('id')
            .eq('client_id', clientId)
          
          if (existingRows && existingRows.length > 0) {
            console.log('[Consultation] Found', existingRows.length, 'existing rows, cleaning up...')
            const idsToDelete = existingRows.map(r => r.id)
            const { error: deleteError } = await supabase
              .from('consultations')
              .delete()
              .in('id', idsToDelete)
            
            if (deleteError) {
              console.error('[Consultation] Cleanup error:', deleteError)
            } else {
              console.log('[Consultation] Cleaned up', idsToDelete.length, 'old rows')
            }
          }
          
          const { data: created, error: createError } = await supabase
            .from('consultations')
            .insert({
              client_id: clientId,
              user_id: user.id,
              sections: EMPTY_SECTIONS,
            })
            .select('id, sections')
            .single()

          if (createError) {
            console.error('[Consultation] Create error:', createError)
            setError('Failed to initialize consultation: ' + createError.message)
            setSections(EMPTY_SECTIONS)
            setConsultationId(null)
            return
          }

          console.log('[Consultation] Created consultation:', created?.id)

          if (created?.sections && typeof created.sections === 'object') {
            setSections((prev) => ({
              ...prev,
              ...created.sections,
            }))
          } else {
            setSections(EMPTY_SECTIONS)
          }

          if (created?.id) {
            setConsultationId(created.id)
          }
          loadedFromDbRef.current = true
          return
        }

        console.log('[Consultation] Loaded existing consultation:', data?.id)

          if (data?.sections && typeof data.sections === 'object') {
            setSections((prev) => ({
              ...prev,
              ...data.sections,
            }))
          } else {
            setSections(EMPTY_SECTIONS)
          }

        if (data?.id) {
          setConsultationId(data.id)
        }
        loadedFromDbRef.current = true
      } catch (err) {
        console.error('Unexpected consultation fetch error:', err)
          setSections(EMPTY_SECTIONS)
        setConsultationId(null)
      }
    }

    fetchConsultation()
  }, [clientId, client, user, authLoading])

  // Keep sectionsRef in sync so visibilitychange can read latest data
  useEffect(() => {
    sectionsRef.current = sections
  }, [sections])

  // ── Core save function ───────────────────────────────────────
  const saveSection = useCallback(
    async (sectionKey) => {
      console.log('[Consultation] saveSection called:', sectionKey, 'consultationId:', consultationId)
      if (!consultationId || !sectionKey) {
        console.log('[Consultation] saveSection skipped - no consultationId or sectionKey')
        return
      }
      try {
        setSaveStatus('saving')
        const dataToSave = sectionsRef.current[sectionKey] || {}
        console.log('[Consultation] Saving to RPC:', { consultationId, sectionKey, dataToSave })
        
        const { error } = await supabase.rpc('merge_consultation_section', {
          p_consultation_id: consultationId,
          p_section_key: sectionKey,
          p_section_data: dataToSave,
        })
        if (error) {
          console.error('[Consultation] RPC save error:', error)
          setSaveStatus('error')
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
          savedTimerRef.current = setTimeout(() => setSaveStatus(''), 3000)
          return
        }
        console.log('[Consultation] Saved successfully')
        setSaveStatus('saved')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaveStatus(''), 2000)
      } catch (err) {
        console.error('[Consultation] Unexpected save error:', err)
        setSaveStatus('error')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaveStatus(''), 3000)
      }
    },
    [consultationId]
  )

  // ── Field update helpers ─────────────────────────────────────
  const updateField = (sectionKey, field, value, instant = false) => {
    lastEditedSectionRef.current = sectionKey
    if (instant) flushAfterRef.current = sectionKey
    setSections((prev) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        [field]: value,
      },
    }))
  }

  const toggleMultiOption = (sectionKey, field, option) => {
    lastEditedSectionRef.current = sectionKey
    flushAfterRef.current = sectionKey // toggles always save instantly
    setSections((prev) => {
      const section = prev[sectionKey] || {}
      const current = Array.isArray(section[field]) ? section[field] : []
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]

      return {
        ...prev,
        [sectionKey]: {
          ...section,
          [field]: next,
        },
      }
    })
  }

  // ── Autosave effect: instant flush OR 800ms debounce ─────────
  useEffect(() => {
    console.log('[Consultation] Autosave effect triggered:', { 
      loadedFromDb: loadedFromDbRef.current, 
      clientId, 
      authLoading, 
      hasUser: !!user, 
      hasClient: !!client, 
      consultationId 
    })
    // Skip saves triggered by loading data from Supabase
    if (!loadedFromDbRef.current) {
      console.log('[Consultation] Skipping autosave - not loaded from DB yet')
      return
    }
    if (!clientId || authLoading || !user || !client || !consultationId) {
      console.log('[Consultation] Skipping autosave - missing dependencies')
      return
    }

    const instantSection = flushAfterRef.current
    if (instantSection) {
      // Instant save for dropdowns / selects / toggles
      console.log('[Consultation] Instant save for:', instantSection)
      flushAfterRef.current = null
      saveSection(instantSection)
      return
    }

    // Debounced save for text fields
    const sectionToSave = lastEditedSectionRef.current
    if (!sectionToSave) {
      console.log('[Consultation] No section to save')
      return
    }

    console.log('[Consultation] Debounced save scheduled for:', sectionToSave)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      console.log('[Consultation] Debounced save executing for:', sectionToSave)
      saveSection(sectionToSave)
    }, 800)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [sections, clientId, client, user, authLoading, consultationId, saveSection])

  // ── Flush pending save on tab switch / minimize ──────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const sectionToSave = lastEditedSectionRef.current
        if (sectionToSave && consultationId) {
          // Cancel pending debounce and save immediately
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = null
          }
          saveSection(sectionToSave)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [consultationId, saveSection])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const generateBlueprint = async () => {
    if (!consultationId) {
      setBlueprintError('Consultation not initialized. Please wait for data to load.')
      return
    }

    setBlueprintGenerating(true)
    setBlueprintError('')
    setBlueprintData(null)

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      
      const response = await fetch(`${API_URL}/api/generate-blueprint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultation_id: consultationId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate blueprint')
      }

      const data = await response.json()
      setBlueprintData(data)
    } catch (err) {
      console.error('Generate blueprint error:', err)
      setBlueprintError(err.message || 'Failed to generate blueprint. Please try again.')
    } finally {
      setBlueprintGenerating(false)
    }
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

  // Show error banner if consultation failed to initialize but client loaded
  const errorBanner = error && client ? (
    <div className="bg-red-50 border-b border-red-200 px-6 py-3">
      <p className="text-sm text-red-700">{error}</p>
    </div>
  ) : null

  const identity = sections.identity || {}
  const lifestyle = sections.lifestyle || {}
  const colorAnalysis = sections.colorAnalysis || {}
  const bodyHarmony = sections.bodyHarmony || {}
  const styleArchetype = sections.styleArchetype || {}
  const wardrobeAudit = sections.wardrobeAudit || {}
  const styleGoals = sections.styleGoals || {}
  const grooming = sections.grooming || {}
  const stylistNotes = sections.stylistNotes || {}

  // Blueprint display section with structured data
  const blueprintSection = blueprintData ? (
    <div className="mt-10 border border-gold/30 rounded-2xl bg-white/90 p-8 shadow-sm">
      <h2 className="text-sm tracking-[0.22em] uppercase text-charcoal mb-6 border-b border-gold/30 pb-4">
        AI Styling Blueprint
      </h2>

      {/* Style Identity */}
      {blueprintData?.blueprint?.style_identity && (
        <div className="mb-8">
          <h3 className="text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80 mb-3">
            Style Identity
          </h3>
          <p className="text-sm text-charcoal/90 leading-relaxed">
            {blueprintData.blueprint.style_identity}
          </p>
        </div>
      )}

      {/* Body Analysis */}
      {blueprintData?.blueprint?.body_analysis && (
        <div className="mb-8">
          <h3 className="text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80 mb-3">
            Body Analysis
          </h3>
          {typeof blueprintData.blueprint.body_analysis === 'object' ? (
            <div className="space-y-2 text-sm text-charcoal/90">
              {blueprintData.blueprint.body_analysis.body_shape && (
                <p><strong>Body Shape:</strong> {blueprintData.blueprint.body_analysis.body_shape}</p>
              )}
              {blueprintData.blueprint.body_analysis.key_features && (
                <p><strong>Key Features:</strong> {blueprintData.blueprint.body_analysis.key_features}</p>
              )}
              {blueprintData.blueprint.body_analysis.fit_guidance && (
                <p><strong>Fit Guidance:</strong> {blueprintData.blueprint.body_analysis.fit_guidance}</p>
              )}
              {blueprintData.blueprint.body_analysis.preferences && (
                <p><strong>Preferences:</strong> {blueprintData.blueprint.body_analysis.preferences}</p>
              )}
              {blueprintData.blueprint.body_analysis.measurements && (
                <p><strong>Measurements:</strong> {blueprintData.blueprint.body_analysis.measurements}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-charcoal/90 leading-relaxed">
              {blueprintData.blueprint.body_analysis}
            </p>
          )}
        </div>
      )}

      {/* Color Palette */}
      {blueprintData?.blueprint?.color_palette && blueprintData.blueprint.color_palette.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80 mb-3">
            Color Palette
          </h3>
          <div className="flex flex-wrap gap-3">
            {blueprintData.blueprint.color_palette.map((color, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div
                  className="w-12 h-12 rounded-lg border border-black/10 shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
                <span className="text-[10px] text-charcoal/60">{color}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hairstyle Images */}
      {blueprintData?.images?.hairstyles && blueprintData.images.hairstyles.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80 mb-3">
            Recommended Hairstyles
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {blueprintData.images.hairstyles.map((url, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden border border-black/10">
                <img
                  src={url}
                  alt={`Hairstyle ${idx + 1}`}
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden w-full h-32 bg-cream items-center justify-center text-[10px] text-charcoal/50">
                  Image unavailable
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outfit Images */}
      {blueprintData?.images?.outfits && blueprintData.images.outfits.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80 mb-3">
            Outfit Inspiration
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {blueprintData.images.outfits.map((url, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden border border-black/10">
                <img
                  src={url}
                  alt={`Outfit ${idx + 1}`}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden w-full h-48 bg-cream items-center justify-center text-[10px] text-charcoal/50">
                  Image unavailable
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setBlueprintData(null)}
        className="mt-6 rounded-lg border border-charcoal/20 px-4 py-2 text-[11px] tracking-[0.15em] uppercase bg-white hover:bg-charcoal/5 transition"
      >
        Close Blueprint
      </button>
    </div>
  ) : null

  const blueprintErrorBanner = blueprintError ? (
    <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
      <p className="text-sm text-red-700">{blueprintError}</p>
    </div>
  ) : null

  return (
    <div className="min-h-screen bg-cream text-black flex flex-col">
      {errorBanner}
      <header className="border-b border-black/10 bg-cream/95 backdrop-blur-sm shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {saveStatus && (
              <span className={`text-[11px] tracking-[0.1em] ${
                saveStatus === 'saving' ? 'text-charcoal/60' : 
                saveStatus === 'saved' ? 'text-green-600' : 
                saveStatus === 'error' ? 'text-red-600' : ''
              }`}>
                {saveStatus === 'saving' && 'Saving…'}
                {saveStatus === 'saved' && 'Saved'}
                {saveStatus === 'error' && 'Save failed'}
              </span>
            )}
            <button
              onClick={generateBlueprint}
              disabled={blueprintGenerating || !consultationId}
              className="rounded-lg border border-gold/50 px-3 py-1.5 text-[11px] tracking-[0.15em] uppercase bg-gold/10 text-charcoal hover:bg-gold/20 transition disabled:opacity-50"
            >
              {blueprintGenerating ? 'Generating…' : 'Generate AI Blueprint'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-lg border border-black/15 px-3 py-1.5 text-[11px] tracking-[0.2em] uppercase bg-white/80 hover:bg-charcoal/5 transition text-charcoal"
            >
              Dashboard
            </button>
            <span className="text-charcoal/40">/</span>
            <span className="text-sm tracking-[0.15em] text-black">
              {client?.name} · {client?.gender} Consultation
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
            {sidebarSections.map((section) => (
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
            {blueprintErrorBanner}
            <div className="border border-black/8 rounded-2xl bg-white/80 p-8 md:p-10 shadow-sm">
              <h2 className="text-sm tracking-[0.22em] uppercase text-charcoal mb-4">
                {activeSection.label}
              </h2>

              {activeSection.key === 'identity' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      How would you describe the person you are today?
                    </label>
                    <textarea
                      rows={4}
                      className="w-full rounded-xl bg-cream border border-black/10 px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition resize-none"
                      value={identity.identity_description || ''}
                      onChange={(e) =>
                        updateField('identity', 'identity_description', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      What life stage are you currently in?
                    </label>
                    <select
                      className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                      value={identity.current_life_stage || ''}
                      onChange={(e) =>
                        updateField('identity', 'current_life_stage', e.target.value, true)
                      }
                    >
                      <option value="">Select</option>
                      {[
                        'Student',
                        'Early Career',
                        'Career Growth',
                        'Parenthood',
                        'Lifestyle Change',
                        'Health Transformation',
                        'Confidence Rebuild',
                      ].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      Which roles do you play daily?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        'Professional',
                        'Student',
                        'Parent',
                        'Entrepreneur',
                        'Homemaker',
                        'Creator',
                      ].map((role) => {
                        const selected = Array.isArray(identity.daily_roles)
                          ? identity.daily_roles.includes(role)
                          : false
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleMultiOption('identity', 'daily_roles', role)}
                            className={`text-left rounded-xl border px-4 py-3 text-sm tracking-[0.06em] transition ${
                              selected
                                ? 'border-gold bg-gold/10 text-charcoal shadow-sm'
                                : 'border-black/10 bg-white/80 text-black hover:border-charcoal/30 hover:bg-white'
                            }`}
                          >
                            {role}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      Which role demands the most from you?
                    </label>
                    <select
                      className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                      value={identity.dominant_role || ''}
                      onChange={(e) =>
                        updateField('identity', 'dominant_role', e.target.value, true)
                      }
                    >
                      <option value="">Select</option>
                      {[
                        'Professional',
                        'Student',
                        'Parent',
                        'Entrepreneur',
                        'Homemaker',
                        'Creator',
                      ].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      How do you want people to perceive you?
                    </label>
                    <select
                      className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                      value={identity.desired_perception || ''}
                      onChange={(e) =>
                        updateField('identity', 'desired_perception', e.target.value, true)
                      }
                    >
                      <option value="">Select</option>
                      {[
                        'Confident',
                        'Elegant',
                        'Approachable',
                        'Powerful',
                        'Creative',
                        'Minimal',
                        'Polished',
                      ].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      What emotion do you want your clothing to communicate?
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                      value={identity.clothing_emotion || ''}
                      onChange={(e) =>
                        updateField('identity', 'clothing_emotion', e.target.value)
                      }
                      placeholder="e.g. Calm confidence"
                    />
                  </div>
                </div>
              )}

              {activeSection.key === 'lifestyle' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      ['home_life_percentage', 'Home life percentage'],
                      ['work_percentage', 'Work percentage'],
                      ['errands_percentage', 'Errands percentage'],
                      ['social_percentage', 'Social percentage'],
                      ['movement_percentage', 'Fitness / movement percentage'],
                      ['travel_percentage', 'Travel percentage'],
                    ].map(([field, label]) => (
                      <div key={field} className="space-y-2">
                        <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                          {label}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                          value={lifestyle[field] ?? ''}
                          onChange={(e) =>
                            updateField(
                              'lifestyle',
                              field,
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                        Work environment
                      </label>
                      <select
                        className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                        value={lifestyle.work_environment || ''}
                        onChange={(e) =>
                          updateField('lifestyle', 'work_environment', e.target.value, true)
                        }
                      >
                        <option value="">Select</option>
                        {[
                          'Corporate',
                          'Business Casual',
                          'Creative',
                          'Remote',
                          'Physical Work',
                        ].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                        Mobility level
                      </label>
                      <select
                        className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                        value={lifestyle.mobility_level || ''}
                        onChange={(e) =>
                          updateField('lifestyle', 'mobility_level', e.target.value, true)
                        }
                      >
                        <option value="">Select</option>
                        {['High', 'Moderate', 'Low'].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      Clothing priorities
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['Comfort', 'Structure', 'Practicality', 'Expression', 'Elegance'].map(
                        (opt) => {
                          const selected = Array.isArray(lifestyle.clothing_priorities)
                            ? lifestyle.clothing_priorities.includes(opt)
                            : false
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                toggleMultiOption('lifestyle', 'clothing_priorities', opt)
                              }
                              className={`text-left rounded-xl border px-4 py-3 text-sm tracking-[0.06em] transition ${
                                selected
                                  ? 'border-gold bg-gold/10 text-charcoal shadow-sm'
                                  : 'border-black/10 bg-white/80 text-black hover:border-charcoal/30 hover:bg-white'
                              }`}
                            >
                              {opt}
                            </button>
                          )
                        }
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      Climate
                    </label>
                    <select
                      className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                      value={lifestyle.climate || ''}
                      onChange={(e) => updateField('lifestyle', 'climate', e.target.value, true)}
                    >
                      <option value="">Select</option>
                      {['Hot', 'Cold', 'Mixed', 'Humid'].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {activeSection.key === 'colorAnalysis' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                        White vs Ivory test
                      </label>
                      <select
                        className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                        value={colorAnalysis.undertone_white_test || ''}
                        onChange={(e) =>
                          updateField('colorAnalysis', 'undertone_white_test', e.target.value, true)
                        }
                      >
                        <option value="">Select</option>
                        {['White suits me', 'Ivory suits me', 'Both'].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                        Jewelry preference
                      </label>
                      <select
                        className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                        value={colorAnalysis.jewelry_preference || ''}
                        onChange={(e) =>
                          updateField('colorAnalysis', 'jewelry_preference', e.target.value, true)
                        }
                      >
                        <option value="">Select</option>
                        {['Gold', 'Silver', 'Both'].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                        Eye color
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                        value={colorAnalysis.eye_color || ''}
                        onChange={(e) => updateField('colorAnalysis', 'eye_color', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                        Hair color
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                        value={colorAnalysis.hair_color || ''}
                        onChange={(e) => updateField('colorAnalysis', 'hair_color', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                        Contrast level
                      </label>
                      <select
                        className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                        value={colorAnalysis.contrast_level || ''}
                        onChange={(e) =>
                          updateField('colorAnalysis', 'contrast_level', e.target.value, true)
                        }
                      >
                        <option value="">Select</option>
                        {['Low', 'Medium', 'High', 'Not sure'].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                        Color intensity
                      </label>
                      <select
                        className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                        value={colorAnalysis.color_intensity || ''}
                        onChange={(e) =>
                          updateField('colorAnalysis', 'color_intensity', e.target.value, true)
                        }
                      >
                        <option value="">Select</option>
                        {['Bright', 'Muted', 'Both'].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      Colors you wear most
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-xl bg-cream border border-black/10 px-4 py-3 text-sm"
                      value={colorAnalysis.frequent_colors || ''}
                      onChange={(e) =>
                        updateField('colorAnalysis', 'frequent_colors', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      Colors you avoid
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-xl bg-cream border border-black/10 px-4 py-3 text-sm"
                      value={colorAnalysis.avoided_colors || ''}
                      onChange={(e) =>
                        updateField('colorAnalysis', 'avoided_colors', e.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              {activeSection.key === 'bodyHarmony' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                        Height
                      </label>
                      <input
                        type="number"
                        className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                        value={bodyHarmony.height ?? ''}
                        onChange={(e) =>
                          updateField(
                            'bodyHarmony',
                            'height',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                        Weight
                      </label>
                      <input
                        type="number"
                        className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                        value={bodyHarmony.weight ?? ''}
                        onChange={(e) =>
                          updateField(
                            'bodyHarmony',
                            'weight',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      Body shape
                    </label>
                    <select
                      className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                      value={bodyHarmony.body_shape || ''}
                      onChange={(e) => updateField('bodyHarmony', 'body_shape', e.target.value, true)}
                    >
                      <option value="">Select</option>
                      {['Rectangle', 'Triangle', 'Inverted Triangle', 'Oval', 'Hourglass'].map(
                        (opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      Body variations
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        'Broad shoulders',
                        'Narrow shoulders',
                        'Full midsection',
                        'Short legs',
                        'Long torso',
                        'Full arms',
                        'Double chin',
                        'Wide hips',
                      ].map((opt) => {
                        const selected = Array.isArray(bodyHarmony.body_variations)
                          ? bodyHarmony.body_variations.includes(opt)
                          : false
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleMultiOption('bodyHarmony', 'body_variations', opt)}
                            className={`text-left rounded-xl border px-4 py-3 text-sm tracking-[0.06em] transition ${
                              selected
                                ? 'border-gold bg-gold/10 text-charcoal shadow-sm'
                                : 'border-black/10 bg-white/80 text-black hover:border-charcoal/30 hover:bg-white'
                            }`}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      Fit preference
                    </label>
                    <select
                      className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                      value={bodyHarmony.fit_preference || ''}
                      onChange={(e) => updateField('bodyHarmony', 'fit_preference', e.target.value, true)}
                    >
                      <option value="">Select</option>
                      {['Fitted', 'Structured', 'Relaxed', 'Flowing'].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                        Preferred neckline
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                        value={bodyHarmony.neckline_preference || ''}
                        onChange={(e) =>
                          updateField('bodyHarmony', 'neckline_preference', e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                        Preferred sleeve length
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                        value={bodyHarmony.sleeve_preference || ''}
                        onChange={(e) =>
                          updateField('bodyHarmony', 'sleeve_preference', e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      Preferred fabric types
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                      value={bodyHarmony.fabric_preference || ''}
                      onChange={(e) =>
                        updateField('bodyHarmony', 'fabric_preference', e.target.value)
                      }
                      placeholder="e.g. Linen, cotton, soft knits"
                    />
                  </div>
                </div>
              )}

              {activeSection.key === 'styleArchetype' && (
                <div className="space-y-6">
                  {(() => {
                    const archetypes = [
                      'Classic Minimalist',
                      'Effortless Natural',
                      'Modern Chic',
                      'Soft Feminine',
                      'Bold Dramatic',
                      'Artsy Eclectic',
                      'Elegant Sophisticate',
                    ]
                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                              Primary style archetype
                            </label>
                            <select
                              className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                              value={styleArchetype.primary_style_archetype || ''}
                              onChange={(e) =>
                                updateField(
                                  'styleArchetype',
                                  'primary_style_archetype',
                                  e.target.value,
                                  true
                                )
                              }
                            >
                              <option value="">Select</option>
                              {archetypes.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                              Secondary style archetype
                            </label>
                            <select
                              className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                              value={styleArchetype.secondary_style_archetype || ''}
                              onChange={(e) =>
                                updateField(
                                  'styleArchetype',
                                  'secondary_style_archetype',
                                  e.target.value,
                                  true
                                )
                              }
                            >
                              <option value="">Select</option>
                              {archetypes.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                            Three words describing your ideal style mood
                          </label>
                          <input
                            type="text"
                            className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                            value={styleArchetype.style_mood_words || ''}
                            onChange={(e) =>
                              updateField('styleArchetype', 'style_mood_words', e.target.value)
                            }
                            placeholder="e.g. Clean, confident, intentional"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                            Style inspirations or references
                          </label>
                          <textarea
                            rows={4}
                            className="w-full rounded-xl bg-cream border border-black/10 px-4 py-3 text-sm"
                            value={styleArchetype.inspiration_sources || ''}
                            onChange={(e) =>
                              updateField(
                                'styleArchetype',
                                'inspiration_sources',
                                e.target.value
                              )
                            }
                            placeholder="Celebrities, Pinterest links, aesthetics, movies, eras…"
                          />
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {activeSection.key === 'wardrobeAudit' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      Items you already own
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        'Structured blazer',
                        'Perfect jeans',
                        'Neutral trousers',
                        'Day dress',
                        'Statement ethnic',
                        'Casual tops',
                        'Layering piece',
                        'Flats',
                        'Heels',
                      ].map((opt) => {
                        const selected = Array.isArray(wardrobeAudit.owned_items)
                          ? wardrobeAudit.owned_items.includes(opt)
                          : false
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleMultiOption('wardrobeAudit', 'owned_items', opt)}
                            className={`text-left rounded-xl border px-4 py-3 text-sm tracking-[0.06em] transition ${
                              selected
                                ? 'border-gold bg-gold/10 text-charcoal shadow-sm'
                                : 'border-black/10 bg-white/80 text-black hover:border-charcoal/30 hover:bg-white'
                            }`}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      Wardrobe problems
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        'Nothing matches',
                        'Wrong colors',
                        'Poor fit',
                        'Outdated',
                        'Too many clothes',
                        'Not enough basics',
                      ].map((opt) => {
                        const selected = Array.isArray(wardrobeAudit.wardrobe_problems)
                          ? wardrobeAudit.wardrobe_problems.includes(opt)
                          : false
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              toggleMultiOption('wardrobeAudit', 'wardrobe_problems', opt)
                            }
                            className={`text-left rounded-xl border px-4 py-3 text-sm tracking-[0.06em] transition ${
                              selected
                                ? 'border-gold bg-gold/10 text-charcoal shadow-sm'
                                : 'border-black/10 bg-white/80 text-black hover:border-charcoal/30 hover:bg-white'
                            }`}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      Budget comfort level
                    </label>
                    <select
                      className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                      value={wardrobeAudit.budget_level || ''}
                      onChange={(e) =>
                        updateField('wardrobeAudit', 'budget_level', e.target.value, true)
                      }
                    >
                      <option value="">Select</option>
                      {['Conservative', 'Moderate', 'Premium'].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {activeSection.key === 'styleGoals' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                      Primary style goal
                    </label>
                    <select
                      className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                      value={styleGoals.primary_style_goal || ''}
                      onChange={(e) =>
                        updateField('styleGoals', 'primary_style_goal', e.target.value, true)
                      }
                    >
                      <option value="">Select</option>
                      {[
                        'Confidence',
                        'Career presence',
                        'Dating',
                        'Personal reset',
                        'Lifestyle change',
                      ].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                        Experimentation level
                      </label>
                      <select
                        className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                        value={styleGoals.experimentation_level || ''}
                        onChange={(e) =>
                          updateField('styleGoals', 'experimentation_level', e.target.value, true)
                        }
                      >
                        <option value="">Select</option>
                        {['Low', 'Medium', 'High'].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                        Transformation timeline
                      </label>
                      <select
                        className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                        value={styleGoals.transformation_timeline || ''}
                        onChange={(e) =>
                          updateField('styleGoals', 'transformation_timeline', e.target.value, true)
                        }
                      >
                        <option value="">Select</option>
                        {['Immediate', '3 months', '6 months+'].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeSection.key === 'grooming' && (
                <div className="space-y-6">
                  {client?.gender === 'Male' ? (
                    <>
                      <div className="space-y-2">
                        <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                          Beard preference
                        </label>
                        <select
                          className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                          value={grooming.beard_preference || ''}
                          onChange={(e) =>
                            updateField('grooming', 'beard_preference', e.target.value, true)
                          }
                        >
                          <option value="">Select</option>
                          {['Clean Shave', 'Stubble', 'Full Beard', 'Mustache'].map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                            Hairline status
                          </label>
                          <select
                            className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                            value={grooming.hairline_status || ''}
                            onChange={(e) =>
                              updateField('grooming', 'hairline_status', e.target.value, true)
                            }
                          >
                            <option value="">Select</option>
                            {['Full', 'Slight Recession', 'Noticeable Recession'].map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                            Grooming effort
                          </label>
                          <select
                            className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                            value={grooming.grooming_effort || ''}
                            onChange={(e) =>
                              updateField('grooming', 'grooming_effort', e.target.value, true)
                            }
                          >
                            <option value="">Select</option>
                            {['Minimal', 'Moderate', 'High'].map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                            Makeup frequency
                          </label>
                          <select
                            className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                            value={grooming.makeup_frequency || ''}
                            onChange={(e) =>
                              updateField('grooming', 'makeup_frequency', e.target.value, true)
                            }
                          >
                            <option value="">Select</option>
                            {['Rarely', 'Occasionally', 'Regularly'].map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                            Jewelry preference
                          </label>
                          <select
                            className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                            value={grooming.jewelry_preference || ''}
                            onChange={(e) =>
                              updateField('grooming', 'jewelry_preference', e.target.value, true)
                            }
                          >
                            <option value="">Select</option>
                            {['Minimal', 'Moderate', 'Statement'].map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                          Hair styling effort
                        </label>
                        <select
                          className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm"
                          value={grooming.hair_styling_effort || ''}
                          onChange={(e) =>
                            updateField('grooming', 'hair_styling_effort', e.target.value, true)
                          }
                        >
                          <option value="">Select</option>
                          {['Low', 'Medium', 'High'].map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeSection.key === 'stylistNotes' && (
                <div className="space-y-4">
                  <label className="block text-xs font-medium tracking-[0.2em] uppercase text-charcoal/80">
                    Internal notes
                  </label>
                  <textarea
                    className="w-full rounded-xl bg-cream border border-black/10 px-4 py-3 text-sm"
                    rows={10}
                    value={stylistNotes.internal_notes || ''}
                    onChange={(e) =>
                      updateField('stylistNotes', 'internal_notes', e.target.value)
                    }
                    placeholder="Notes for internal use only…"
                  />
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span
                  className={`text-[11px] transition-opacity duration-500 ${
                    saveStatus === 'saving'
                      ? 'text-charcoal/60'
                      : saveStatus === 'saved'
                        ? 'text-emerald-600'
                        : saveStatus === 'error'
                          ? 'text-red-600 font-medium'
                          : 'text-charcoal/30'
                  }`}
                >
                  {saveStatus === 'saving'
                    ? 'Saving…'
                    : saveStatus === 'saved'
                      ? 'Saved ✓'
                      : saveStatus === 'error'
                        ? 'Error saving'
                        : 'Auto-save enabled'}
                </span>
              </div>

              <button
                type="button"
                disabled={!consultationId || blueprintGenerating}
                onClick={async () => {
                  if (!consultationId) return
                  setBlueprintGenerating(true)
                  setBlueprintError('')
                  try {
                    const res = await fetch('/api/generate-report', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ consultationId }),
                    })

                    if (!res.ok) {
                      const msg = await res.text()
                      setBlueprintGenerating(false)
                      setBlueprintError(msg || 'Failed to generate report.')
                      return
                    }

                    const blob = await res.blob()
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `Personal-Style-Blueprint-${client?.name || 'client'}.pdf` 
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    window.URL.revokeObjectURL(url)
                  } catch (e) {
                    setBlueprintError('AI report generation failed. Please try again.')
                  } finally {
                    setBlueprintGenerating(false)
                  }
                }}
                className="mt-8 w-full rounded-lg bg-charcoal text-cream text-sm font-medium tracking-[0.2em] uppercase py-4 hover:bg-charcoal/90 disabled:opacity-60 transition"
              >
                {blueprintGenerating ? 'Generating…' : 'Generate AI Style Blueprint (PDF)'}
              </button>

              {blueprintError && (
                <p className="mt-2 text-xs text-red-600 text-center">{blueprintError}</p>
              )}

              {blueprintSection}
            </div>
          </div>
        </main>
      </div>

      {/* PDF Generation Loading Overlay */}
      {blueprintGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative bg-[#F7F4EE] rounded-2xl px-12 py-10 flex flex-col items-center gap-6 shadow-2xl max-w-sm w-full mx-4">

            {/* Animated logo mark */}
            <div className="relative flex items-center justify-center w-20 h-20">
              {/* Outer rotating ring */}
              <div className="absolute inset-0 rounded-full border-2 border-[#C9A96E]/20 animate-spin" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-1 rounded-full border border-[#C9A96E]/40 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
              {/* Inner pulsing dot */}
              <div className="w-8 h-8 rounded-full bg-[#C9A96E]/20 flex items-center justify-center animate-pulse">
                <div className="w-3 h-3 rounded-full bg-[#C9A96E]" />
              </div>
            </div>

            {/* Text */}
            <div className="text-center space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-[#C9A96E]">
                Peak Perfection
              </p>
              <h3 className="text-lg font-semibold tracking-tight text-[#0A0A0A]">
                Crafting Your Blueprint
              </h3>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                We're building your personalised style report.<br />
                This takes about 30–60 seconds.
              </p>
            </div>

            {/* Animated progress steps */}
            <PdfGenerationSteps />

            {/* Fine print */}
            <p className="text-[10px] text-[#AEAEAE] text-center tracking-wide">
              Do not close or refresh this page
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Animated step-through component shown during PDF generation
function PdfGenerationSteps() {
  const steps = [
    'Analysing consultation data…',
    'Generating style recommendations…',
    'Curating outfit references…',
    'Fetching hairstyle images…',
    'Composing your PDF…',
  ]
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev))
    }, 9000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full space-y-2">
      {steps.map((step, i) => (
        <div
          key={step}
          className={`flex items-center gap-3 transition-all duration-500 ${
            i < currentStep
              ? 'opacity-40'
              : i === currentStep
              ? 'opacity-100'
              : 'opacity-20'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
              i < currentStep
                ? 'bg-[#C9A96E]'
                : i === currentStep
                ? 'bg-[#C9A96E]/30 ring-2 ring-[#C9A96E] ring-offset-1 animate-pulse'
                : 'bg-[#D4D0C8]'
            }`}
          >
            {i < currentStep && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span
            className={`text-xs tracking-wide transition-all duration-500 ${
              i === currentStep ? 'text-[#0A0A0A] font-medium' : 'text-[#6B6B6B]'
            }`}
          >
            {step}
          </span>
        </div>
      ))}
    </div>
  )
}
