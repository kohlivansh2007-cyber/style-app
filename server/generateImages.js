import { generateImage } from './utils/openrouter.js'

export async function generateImages({ sections, reportJson, client }) {
  const gender = client?.gender || 'person'

  // Generate hairstyle images based on recommendations
  const hairstyleImages = []
  const hairstyles = reportJson?.face_analysis?.recommended_hairstyles || []
  for (const style of hairstyles.slice(0, 3)) {
    const prompt = `${gender} with ${style} hairstyle, professional fashion photography, clean neutral background, high-end editorial style`
    hairstyleImages.push(generateImage(prompt))
  }

  // Generate outfit images based on outfit formulas
  const outfitImages = []
  const formulas = reportJson?.outfit_formulas || {}
  const allOutfits = [
    ...(formulas.casual_outfits || []),
    ...(formulas.smart_casual_outfits || []),
    ...(formulas.professional_outfits || [])
  ]
  for (const outfit of allOutfits.slice(0, 3)) {
    const prompt = `${outfit}, fashion editorial style, ${gender} model, professional photography, clean background`
    outfitImages.push(generateImage(prompt))
  }

  // Generate eyewear images based on recommended frames
  const eyewearImages = []
  const frames = reportJson?.eyewear_strategy?.recommended_frames || []
  for (const frame of frames.slice(0, 2)) {
    const prompt = `${gender} wearing ${frame} eyeglasses, professional fashion photography, face close-up, clean neutral background`
    eyewearImages.push(generateImage(prompt))
  }

  return {
    hairstyles: hairstyleImages,
    outfits: outfitImages,
    eyewear: eyewearImages
  }
}
