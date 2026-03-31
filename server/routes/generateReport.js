import express from 'express';
import supabase from '../supabaseClient.js';
import { generatePDF } from '../generatePDF.js';
import { normalizeReport } from '../utils/normalizeReport.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { consultationId } = req.body;

    if (!consultationId) {
      return res.status(400).json({ error: 'consultationId is required' });
    }

    console.log('[GenerateReport] Fetching report for consultation:', consultationId);

    // Load report from Supabase
    const { data: report, error: reportError } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (reportError) {
      console.error('[GenerateReport] Supabase error:', reportError);
      return res.status(500).json({
        error: 'Failed to fetch report from database',
        details: reportError.message
      });
    }

    if (!report) {
      return res.status(404).json({ error: 'No report found for this consultation' });
    }

    // STEP 5: Verify Database Retrieval
    console.log("========== DATABASE LOAD DEBUG ==========")
    console.log("Full report object keys:", Object.keys(report))
    console.log("Report ID:", report.id)
    console.log("Consultation ID:", report.consultation_id)
    console.log("Client ID:", report.client_id)
    console.log("report_json exists:", !!report.report_json)
    console.log("image_urls exists:", !!report.image_urls)
    if (report.image_urls) {
      console.log("Hairstyle URLs in DB:", report.image_urls.hairstyles?.length || 0)
      console.log("Outfit URLs in DB:", report.image_urls.outfits?.length || 0)
      console.log("Eyewear URLs in DB:", report.image_urls.eyewear?.length || 0)
      console.log("First hairstyle URL:", report.image_urls.hairstyles?.[0]?.substring(0, 60) + "...")
    }
    console.log("=========================================")

    // Load images from database with fallback
    const images = report.image_urls || {
      hairstyles: [],
      outfits: [],
      eyewear: []
    };

    // STEP 6: Validate Image URLs Before PDF
    console.log("========== IMAGE VALIDATION ==========")
    console.log("PDF IMAGES:", images)
    console.log("Hairstyle count:", images.hairstyles?.length || 0)
    console.log("Outfit count:", images.outfits?.length || 0)
    console.log("Eyewear count:", images.eyewear?.length || 0)
    console.log("======================================")

    console.log('[GenerateReport] Images loaded:', {
      hairstyles: images.hairstyles?.length || 0,
      outfits: images.outfits?.length || 0,
      eyewear: images.eyewear?.length || 0
    });

    // Normalize report data (convert AI schema to PDF schema)
    console.log("[GenerateReport] Raw report.report_json keys:", Object.keys(report.report_json || {}));
    const reportData = normalizeReport(report.report_json);
    console.log("[GenerateReport] Normalized reportData keys:", Object.keys(reportData));
    console.log("[GenerateReport] style_identity_overview value:", reportData.style_identity_overview?.substring(0, 50));
    
    // STEP 5 continued: Verify normalized report
    console.log("========== NORMALIZED REPORT DEBUG ==========")
    console.log("REPORT KEYS:", Object.keys(reportData))
    console.log("style_identity_overview length:", reportData.style_identity_overview?.length || 0)
    console.log("body_harmony length:", reportData.body_harmony?.length || 0)
    console.log("color_analysis length:", reportData.color_analysis?.length || 0)
    console.log("=============================================")

    // Load client info for cover page
    const { data: consultation } = await supabase
      .from('consultations')
      .select('client_id')
      .eq('id', consultationId)
      .single();

    let client = null;
    if (consultation?.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('name')
        .eq('id', consultation.client_id)
        .single();
      client = clientData;
    }

    // Generate PDF
    console.log('[GenerateReport] Generating PDF...');
    console.log('[GenerateReport] Data being passed to PDF:');
    console.log('  - style_identity_overview:', reportData.style_identity_overview ? 'EXISTS length=' + reportData.style_identity_overview.length : 'MISSING');
    console.log('  - body_harmony:', reportData.body_harmony ? 'EXISTS length=' + reportData.body_harmony.length : 'MISSING');
    console.log('  - color_analysis:', reportData.color_analysis ? 'EXISTS length=' + reportData.color_analysis.length : 'MISSING');
    
    const pdfBuffer = await generatePDF({
      report: { report_json: reportData },
      image_urls: images,
      client: client
    });

    console.log('[GenerateReport] PDF generated successfully');

    // Return the PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Personal-Style-Blueprint-${consultationId}.pdf"`
    );
    res.send(pdfBuffer);

  } catch (error) {
    console.error('[GenerateReport] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

export default router;
