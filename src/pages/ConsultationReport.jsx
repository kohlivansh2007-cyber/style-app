import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function ConsultationReport() {
  const { consultationId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchReport() {
      try {
        const { data, error } = await supabase
          .from('ai_reports')
          .select('*')
          .eq('consultation_id', consultationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (error) throw error
        setReport(data)
      } catch (err) {
        console.error('Error fetching report:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [consultationId])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream text-black px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <p>Loading report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-cream text-black px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-light tracking-[0.18em] mb-2">
            AI Style Blueprint
          </h1>
          <p className="text-sm text-charcoal/70 mb-6">
            Consultation ID: <span className="font-mono">{consultationId}</span>
          </p>
          <div className="border border-black/10 rounded-2xl bg-white/70 p-6">
            <p className="text-sm text-charcoal/80">
              {error ? `Error loading report: ${error}` : 'No report found for this consultation.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-6 rounded-lg border border-charcoal/20 px-4 py-2 text-xs tracking-[0.18em] uppercase bg-white/80 hover:bg-charcoal/5 transition text-charcoal"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const reportData = report.report_json || {}

  return (
    <div className="min-h-screen bg-cream text-black px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-light tracking-[0.18em] mb-2">
          AI Style Blueprint
        </h1>
        <p className="text-sm text-charcoal/70 mb-6">
          Consultation ID: <span className="font-mono">{consultationId}</span>
          {report.generation_status && (
            <span className="ml-4 px-2 py-1 text-xs rounded bg-gold/20 text-gold">
              {report.generation_status}
            </span>
          )}
        </p>

        {/* Report Content */}
        <div className="border border-black/10 rounded-2xl bg-white/70 p-6 mb-8">
          {reportData.meta && (
            <div className="mb-6">
              <h2 className="text-lg font-medium mb-2">
                {reportData.meta.archetype_primary || 'Style Profile'}
              </h2>
              {reportData.meta.style_words && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {reportData.meta.style_words.map((word, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-charcoal/10 rounded">
                      {word}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {reportData.style_identity?.overview && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-charcoal/80 mb-1">Style Overview</h3>
              <p className="text-sm text-charcoal/70">{reportData.style_identity.overview}</p>
            </div>
          )}

          {reportData.closing_message && (
            <div className="mt-6 p-4 bg-gold/10 rounded-lg">
              <p className="text-sm italic text-charcoal/80">{reportData.closing_message}</p>
            </div>
          )}
        </div>

        {/* Image Gallery */}
        <div className="image-gallery space-y-8">
          {report.image_urls?.hairstyles?.length > 0 && (
            <div className="gallery-section">
              <h3 className="text-sm font-medium tracking-[0.18em] uppercase mb-4 text-charcoal/80">
                Recommended Hairstyles
              </h3>
              <div className="gallery-row flex flex-wrap gap-4">
                {report.image_urls.hairstyles.map((url, i) => (
                  url && (
                    <img 
                      key={i} 
                      src={url} 
                      alt="Hairstyle reference" 
                      className="object-cover rounded-lg"
                      style={{
                        width: 200, 
                        height: 250, 
                        objectFit: 'cover', 
                        border: '1px solid #C9A96E'
                      }} 
                    />
                  )
                ))}
              </div>
            </div>
          )}

          {report.image_urls?.outfits?.length > 0 && (
            <div className="gallery-section">
              <h3 className="text-sm font-medium tracking-[0.18em] uppercase mb-4 text-charcoal/80">
                Outfit Inspiration
              </h3>
              <div className="gallery-grid flex flex-wrap gap-4">
                {report.image_urls.outfits.map((url, i) => (
                  url && (
                    <img 
                      key={i} 
                      src={url} 
                      alt="Outfit reference"
                      className="object-cover rounded-lg"
                      style={{
                        width: 180, 
                        height: 220,
                        objectFit: 'cover',
                        border: '1px solid #C9A96E'
                      }} 
                    />
                  )
                ))}
              </div>
            </div>
          )}

          {report.image_urls?.eyewear?.length > 0 && (
            <div className="gallery-section">
              <h3 className="text-sm font-medium tracking-[0.18em] uppercase mb-4 text-charcoal/80">
                Eyewear Direction
              </h3>
              <div className="gallery-row flex flex-wrap gap-4">
                {report.image_urls.eyewear.map((url, i) => (
                  url && (
                    <img 
                      key={i} 
                      src={url} 
                      alt="Eyewear reference"
                      className="object-cover rounded-lg"
                      style={{
                        width: 160, 
                        height: 160,
                        objectFit: 'cover',
                        border: '1px solid #C9A96E'
                      }} 
                    />
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-8 rounded-lg border border-charcoal/20 px-4 py-2 text-xs tracking-[0.18em] uppercase bg-white/80 hover:bg-charcoal/5 transition text-charcoal"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}

