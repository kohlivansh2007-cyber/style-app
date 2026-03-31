import express from 'express';
import supabase from '../supabaseClient.js';
import { generateBlueprint } from '../utils/openrouter.js';
import { fetchAllImages } from '../utils/imageFetcher.js';

const router = express.Router();

router.post('/', async (req, res) => {
  let generationStatus = 'processing';
  let savedReportId = null;
  
  try {
    const { consultation_id } = req.body;

    if (!consultation_id) {
      return res.status(400).json({ error: 'consultation_id is required' });
    }

    console.log('[GenerateBlueprint] Fetching consultation:', consultation_id);
    
    // Set initial status to processing
    generationStatus = 'processing';

    // Fetch consultation data from Supabase
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', consultation_id)
      .single();

    if (consultationError) {
      console.error('[GenerateBlueprint] Consultation fetch error:', consultationError);
      return res.status(500).json({ 
        error: 'Failed to fetch consultation data',
        details: consultationError.message 
      });
    }

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    const client_id = consultation.client_id;

    // Fetch client data for additional context
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name, gender, photo_path')
      .eq('id', client_id)
      .single();

    if (clientError) {
      console.error('[GenerateBlueprint] Client fetch error:', clientError);
    }

    // Prepare consultation data for AI
    const consultationData = {
      client: client || { id: client_id },
      sections: consultation.sections || {},
      created_at: consultation.created_at,
      updated_at: consultation.updated_at
    };

    console.log('[GenerateBlueprint] Generating premium consultation report with OpenRouter');

    // Generate structured consultation report
    const report = await generateBlueprint(consultationData);

    console.log('[GenerateBlueprint] Report generated, fetching images from Google');
    
    // Determine gender from consultation sections
    const gender = client?.gender || 
                   consultation.sections?.basicInfo?.gender || 
                   consultation.sections?.personal?.gender ||
                   consultation.sections?.profile?.gender || 'male';

    // Fetch images from Google
    let imageUrls = { hairstyles: [], outfits: [], eyewear: [] };
    try {
      const imageResults = await fetchAllImages(report, gender);
      imageUrls = imageResults.urls;
      console.log('[Blueprint] Images fetched:', imageUrls);
    } catch (imageError) {
      console.error('[Blueprint] Image fetch failed:', imageError.message);
      // Continue without images - don't fail the whole request
    }

    // Prepare result object with full report structure and images
    const result = {
      blueprint: {
        identity_profile: report.identity_profile,
        body_analysis: report.body_analysis,
        face_analysis: report.face_analysis,
        eyewear_strategy: report.eyewear_strategy,
        color_system: report.color_system,
        wardrobe_foundation: report.wardrobe_foundation,
        outfit_formulas: report.outfit_formulas,
        accessories_strategy: report.accessories_strategy,
        grooming_strategy: report.grooming_strategy,
        shopping_strategy: report.shopping_strategy
      },
      images: imageUrls
    };

    // Save the report to ai_reports table with blueprint JSON, image URLs, and generation_status
    const { data: savedReport, error: saveError } = await supabase
      .from('ai_reports')
      .insert({
        consultation_id: consultation_id,
        client_id: client_id,
        report_json: report,
        image_urls: imageUrls,
        generation_status: 'complete', // Fix: Set to complete
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('[GenerateBlueprint] Database save error:', saveError);
      // Try to update status to failed
      generationStatus = 'failed';
      return res.status(500).json({ 
        error: 'Failed to save report to database',
        details: saveError.message 
      });
    }

    savedReportId = savedReport.id;
    generationStatus = 'complete';
    console.log('[GenerateBlueprint] Report saved successfully:', savedReport.id);

    // Return the generated report and images
    return res.json({
      blueprint: result.blueprint,
      images: result.images,
      report_id: savedReport.id
    });

  } catch (error) {
    console.error('[GenerateBlueprint] Unexpected error:', error);
    generationStatus = 'failed';
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

export default router;
