import dotenv from "dotenv";
dotenv.config();
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { generateReport } from './generateReport.js'
import { generateImages } from './generateImages.js'
import { generatePDF } from './generatePDF.js'
import { fetchAllImages } from './utils/imageFetcher.js'
import blueprintRoute from './routes/generateBlueprint.js'
import reportRoute from './routes/generateReport.js'

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  FRONTEND_ORIGIN,
  PORT = '3001',
} = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server env')
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const app = express()

app.use(
  cors({
    origin: FRONTEND_ORIGIN || true,
    credentials: true,
  })
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/generate-report', async (req, res) => {
  let generationStatus = 'processing'
  
  try {
    const { consultationId } = req.body || {}
    if (!consultationId || typeof consultationId !== 'string') {
      return res.status(400).json({ error: 'consultationId is required' })
    }

    // 1) Retrieve consultation + client
    const { data: consultation, error: consultationError } = await supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('id', consultationId)
      .single()

    if (consultationError || !consultation) {
      return res.status(404).json({
        error: 'Consultation not found',
        details: consultationError?.message,
      })
    }

    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', consultation.client_id)
      .single()

    if (clientError || !client) {
      return res.status(404).json({
        error: 'Client not found',
        details: clientError?.message,
      })
    }

    const sections = consultation.sections && typeof consultation.sections === 'object'
      ? consultation.sections
      : {}

    // 6) Store report in ai_reports table (or return existing)
    const { data: existingReport, error: existingError } = await supabaseAdmin
      .from('ai_reports')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingError) {
      // Do not fail hard; still allow generation
      console.warn('ai_reports lookup error:', existingError.message)
    }

    if (existingReport?.pdf_url) {
      // If we stored a URL previously, return it as JSON for now.
      // Frontend expects PDF bytes; we will also support returning the bytes below.
      return res.status(200).json({
        status: 'existing',
        pdfUrl: existingReport.pdf_url,
        reportJson: existingReport.report_json ?? null,
      })
    }

    // 3) Generate AI report text JSON
    const reportJson = await generateReport({ sections, client })

    console.log("REPORT DATA:", JSON.stringify(reportJson, null, 2))
    
    // Determine gender for image search
    const gender = client?.gender || 
                   sections?.basicInfo?.gender || 
                   sections?.personal?.gender ||
                   sections?.profile?.gender || 'male'

    // 4) Fetch real images from Google
    let imageUrls = { hairstyles: [], outfits: [], eyewear: [] }
    try {
      const imageResults = await fetchAllImages(reportJson, gender)
      imageUrls = imageResults.urls
      console.log('[GenerateReport] Images fetched:', imageUrls)
    } catch (imageError) {
      console.error('[GenerateReport] Image fetch failed:', imageError.message)
      // Continue without images - don't fail the whole request
    }

    // 5a) Resolve client photo URL if photo_path exists
    let clientPhotoUrl = null
    if (client?.photo_path) {
      try {
        const { data: photoData } = supabaseAdmin.storage
          .from('client-photos')
          .getPublicUrl(client.photo_path)
        clientPhotoUrl = photoData?.publicUrl ?? null
        console.log('[GenerateReport] Client photo URL:', clientPhotoUrl ? 'resolved' : 'null')
      } catch (photoErr) {
        console.warn('[GenerateReport] Could not resolve client photo URL:', photoErr.message)
      }
    }

    // 5b) Generate PDF bytes
    const pdfBytes = await generatePDF({
      client,
      consultation,
      report: { report_json: reportJson },
      image_urls: imageUrls,
      client_photo_url: clientPhotoUrl,
    })

    // 6) Upload PDF to Supabase Storage (optional) + store record
    // If no storage bucket exists, we still store report_json with pdf_url = null.
    let pdfUrl = null
    try {
      const bucket = 'ai-reports'
      const filePath = `${consultationId}/style-blueprint.pdf`
      const upload = await supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        })
      if (!upload.error) {
        const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath)
        pdfUrl = data?.publicUrl ?? null
      } else {
        console.warn('PDF upload skipped:', upload.error.message)
      }
    } catch (e) {
      console.warn('PDF upload failed/skipped:', e?.message)
    }

    await supabaseAdmin.from('ai_reports').insert({
      consultation_id: consultationId,
      report_json: reportJson,
      image_urls: imageUrls,
      pdf_url: pdfUrl,
      generation_status: 'complete', // Fix: Set to complete
      created_at: new Date().toISOString(),
    })

    // 7) Return PDF to frontend
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Personal-Style-Blueprint-${client.name || 'client'}.pdf"`
    )
    return res.status(200).send(Buffer.from(pdfBytes))
  } catch (err) {
    console.error('generate-report error:', err)
    generationStatus = 'failed'
    return res.status(500).json({
      error: 'Failed to generate report',
      details: err?.message ?? String(err),
    })
  }
})

// New AI Blueprint endpoint using OpenRouter with image generation
app.use('/api/generate-blueprint', blueprintRoute)

// PDF generation endpoint
app.use('/api/generate-report', reportRoute)

app.listen(Number(PORT), () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})

