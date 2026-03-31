import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { uploadClientPhoto } from '../lib/storage'

const GENDERS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
]

export default function NewClient() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const photoPreviewUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile]
  )

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    }
  }, [photoPreviewUrl])

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPEG, PNG, WebP, or GIF).')
      return
    }
    setError('')
    setPhotoFile(file)
  }

  const handleCreateClient = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError || !userData?.user) {
        console.error('User not authenticated', userError)
        setError('User not authenticated')
        return
      }

      const { data, error } = await supabase
        .from('clients')
        .insert([
          {
            name: name,
            gender: gender,
            user_id: userData.user.id,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error('Insert error:', error)
        setError(error.message)
        return
      }

      setError(null)
      navigate(`/consultation/${data.id}`)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Unable to create client. Please try again.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!gender || !name.trim()) {
      setError('Name and gender are required.')
      return
    }

    setLoading(true)
    setError('')

    await handleCreateClient()

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-cream text-black">
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-black/10 bg-cream/95 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs tracking-[0.35em] uppercase text-charcoal/60">
                Peak Perfection
              </p>
              <p className="text-sm text-charcoal/70">New client</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="rounded-lg border border-charcoal/20 px-4 py-2 text-xs tracking-[0.18em] uppercase bg-white/80 hover:bg-charcoal/5 transition text-charcoal"
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center py-10">
          <div className="max-w-md w-full px-6">
            <div className="border border-black/10 rounded-2xl bg-white/80 px-7 py-8 shadow-sm">
              <h1 className="text-2xl font-light tracking-[0.18em] mb-1 text-black">
                New Client
              </h1>
              <p className="text-sm text-charcoal/70 mb-6">
                Enter name and gender to start a tailored consultation. Photo is
                optional.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-xs font-medium tracking-[0.25em] uppercase text-charcoal/80">
                    Client name <span className="text-gold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm text-black placeholder:text-charcoal/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
                    placeholder="Alex Rivera"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium tracking-[0.25em] uppercase text-charcoal/80">
                    Gender <span className="text-gold">*</span>
                  </label>
                  <select
                    required
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition appearance-none cursor-pointer"
                  >
                    <option value="">Select</option>
                    {GENDERS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium tracking-[0.25em] uppercase text-charcoal/80">
                    Client photo <span className="text-charcoal/50">(optional)</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handlePhotoChange}
                    className="sr-only"
                    aria-label="Upload client photo"
                  />
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="w-24 h-24 rounded-full border border-black/15 bg-cream flex items-center justify-center overflow-hidden">
                        {photoPreviewUrl ? (
                          <img
                            src={photoPreviewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] tracking-widest uppercase text-charcoal/40">
                            No photo
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg border border-charcoal/20 px-4 py-2 text-[11px] tracking-[0.2em] uppercase bg-white hover:bg-charcoal/5 transition text-left text-charcoal"
                      >
                        {photoPreviewUrl ? 'Change photo' : 'Upload photo'}
                      </button>
                      {photoPreviewUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="text-[11px] text-charcoal/60 hover:text-black transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-charcoal text-cream text-sm font-medium tracking-[0.2em] uppercase py-3 hover:bg-charcoal/90 disabled:opacity-70 transition"
                >
                  {loading ? 'Starting…' : 'Start Consultation'}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
