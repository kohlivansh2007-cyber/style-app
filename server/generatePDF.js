import PDFDocument from 'pdfkit'
import axios from 'axios'
import { fetchAllImages } from './utils/imageFetcher.js'

// ─────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS — A4 in points (1 pt = 1/72 inch)
// ─────────────────────────────────────────────────────────────
const PAGE_W        = 595
const PAGE_H        = 842
const ML            = 55          // left margin
const MR            = 55          // right margin
const CONTENT_W     = PAGE_W - ML - MR   // 485 pts usable width
const HEADER_BASE   = 118         // top-down Y cursor starts here (below header rule)

// ─────────────────────────────────────────────────────────────
// BRAND COLORS
// ─────────────────────────────────────────────────────────────
const C_BLACK      = '#0A0A0A'
const C_CHARCOAL   = '#1C1C1C'
const C_DARK_GRAY  = '#2E2E2E'
const C_MID_GRAY   = '#6B6B6B'
const C_LIGHT_GRAY = '#AEAEAE'
const C_RULE       = '#D4D0C8'
const C_CREAM      = '#F7F4EE'
const C_GOLD       = '#C9A96E'
const C_ACCENT     = '#8B7355'
const C_WHITE      = '#FFFFFF'
const C_BG_ALT     = '#F0ECE4'

// ─────────────────────────────────────────────────────────────
// HELPER: fetch image buffer from URL with retry, redirect handling, and validation
// ─────────────────────────────────────────────────────────────
async function fetchBuffer(url, retries = 3) {
  if (!url) return null
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        maxRedirects: 10,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        },
        validateStatus: (status) => status < 400,
      })

      const buf = Buffer.from(res.data)

      if (buf.length < 1024) {
        console.warn(`[PDF] fetchBuffer attempt ${attempt}: buffer too small (${buf.length} bytes), retrying...`, url.substring(0, 80))
        continue
      }

      const magic = buf.slice(0, 4)
      const isJPEG = magic[0] === 0xFF && magic[1] === 0xD8
      const isPNG  = magic[0] === 0x89 && magic[1] === 0x50
      const isGIF  = magic[0] === 0x47 && magic[1] === 0x49
      const isWEBP = magic[0] === 0x52 && magic[1] === 0x49 && magic[2] === 0x46 && magic[3] === 0x46

      if (!isJPEG && !isPNG && !isGIF && !isWEBP) {
        console.warn(`[PDF] fetchBuffer attempt ${attempt}: not a valid image buffer, retrying...`, url.substring(0, 80), `magic: ${magic.toString('hex')}`)
        continue
      }

      console.log(`[PDF] fetchBuffer OK (${buf.length} bytes, attempt ${attempt}):`, url.substring(0, 80))
      return buf

    } catch (e) {
      console.warn(`[PDF] fetchBuffer attempt ${attempt} error:`, e.message, url?.substring(0, 80))
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * attempt))
      }
    }
  }
  console.error(`[PDF] fetchBuffer FAILED after ${retries} attempts:`, url?.substring(0, 80))
  return null
}

// ─────────────────────────────────────────────────────────────
// HELPER: embed image into a fixed box — always top-down
//
// FIX 1: caption goes ABOVE the box at (y - 14), not below
//         and caller passes y with enough room above for it.
// FIX 2: cover:[w,h] resizes ANY source image to exactly w×h
//         so varying SERP image dimensions never break layout.
// ─────────────────────────────────────────────────────────────
function embedImage(doc, buf, x, y, w, h, caption) {
  if (caption) {
    doc.fillColor(C_LIGHT_GRAY).fontSize(6).font('Helvetica')
      .text(caption.toUpperCase(), x, y - 14, { width: w, align: 'center' })
  }

  if (!buf || buf.length < 1024) {
    console.warn(`[PDF] embedImage: buffer invalid or too small at x=${x} y=${y}, showing placeholder`)
    doc.rect(x, y, w, h).fill(C_BG_ALT)
    return y + h
  }

  try {
    doc.image(buf, x, y, { width: w, height: h, cover: [w, h] })
    doc.rect(x, y, w, h).lineWidth(1.2).strokeColor(C_GOLD).stroke()
  } catch (e) {
    console.error('[PDF] Image embed failed at x=' + x + ' y=' + y + ' w=' + w + ' h=' + h + ':', e.message)
    doc.rect(x, y, w, h).fill(C_BG_ALT)
  }

  return y + h
}

// ─────────────────────────────────────────────────────────────
// HELPER: standard page chrome (background, gold bar, left
//         rule, running header, header rule)
// ─────────────────────────────────────────────────────────────
function drawBase(doc, pageNum) {
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(C_CREAM)
  doc.rect(0, PAGE_H - 2, PAGE_W, 2).fill(C_GOLD)
  doc.moveTo(40, 30).lineTo(40, PAGE_H - 30)
    .lineWidth(0.3).strokeColor(C_GOLD).stroke()
  doc.fillColor(C_LIGHT_GRAY).fontSize(7).font('Helvetica')
    .text('PEAK PERFECTION  ·  PERSONAL STYLE BLUEPRINT', 60, 15,
      { width: PAGE_W - 120, align: 'right' })
  doc.moveTo(55, 28).lineTo(PAGE_W - 55, 28)
    .lineWidth(0.4).strokeColor(C_RULE).stroke()
  doc.fillColor(C_LIGHT_GRAY).fontSize(8).font('Helvetica')
    .text(`— ${pageNum} —`, 60, 16, { width: PAGE_W - 120, align: 'center' })
}

// ─────────────────────────────────────────────────────────────
// HELPER: section label + large title + gold/light rules
//         Always anchored from the TOP (y=50 label, y=62 title)
// ─────────────────────────────────────────────────────────────
function drawHeader(doc, label, title) {
  doc.fillColor(C_GOLD).fontSize(7).font('Helvetica-Bold').text(label, ML, 50)
  doc.fillColor(C_BLACK).fontSize(26).font('Helvetica-Bold').text(title, ML, 62)
  doc.moveTo(ML, 104).lineTo(ML + 75, 104)
    .lineWidth(1.2).strokeColor(C_GOLD).stroke()
  doc.moveTo(ML + 79, 104).lineTo(PAGE_W - MR, 104)
    .lineWidth(0.3).strokeColor(C_RULE).stroke()
}

// ─────────────────────────────────────────────────────────────
// HELPER: image-only page footer (section tag + subtitle + rule)
//         Drawn at the BOTTOM of the page, fixed position.
// ─────────────────────────────────────────────────────────────
function drawImagePageFooter(doc, sectionTag, subtitle) {
  doc.moveTo(ML, PAGE_H - 76).lineTo(PAGE_W - MR, PAGE_H - 76)
    .lineWidth(0.3).strokeColor(C_RULE).stroke()
  doc.fillColor(C_MID_GRAY).fontSize(9).font('Helvetica')
    .text(subtitle, ML, PAGE_H - 65)
  doc.fillColor(C_GOLD).fontSize(7).font('Helvetica-Bold')
    .text(sectionTag, ML, PAGE_H - 50)
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────
export async function generatePDF({ client, consultation, report, image_urls, client_photo_url }) {
  const data      = report?.report_json || {}
  const imageUrls = image_urls || {}

  return new Promise(async (resolve, reject) => {
    const doc     = new PDFDocument({ size: 'A4', margin: 0 })
    const buffers = []

    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => resolve(Buffer.concat(buffers)))
    doc.on('error', reject)

    // ── Preload images ──────────────────────────────────────
    const gender    = client?.gender || 'male'
    let pdfImages   = { hairstyles: [], outfits: [], eyewear: [] }

    // ── Fetch client cover photo ────────────────────────────
    let clientPhotoBuf = null
    if (client_photo_url) {
      try {
        console.log('[PDF] Fetching client cover photo...')
        clientPhotoBuf = await fetchBuffer(client_photo_url)
        if (clientPhotoBuf) {
          console.log('[PDF] Client cover photo loaded OK:', clientPhotoBuf.length, 'bytes')
        } else {
          console.warn('[PDF] Client cover photo fetch returned null — will use decorative fallback')
        }
      } catch (photoErr) {
        console.warn('[PDF] Client cover photo fetch failed:', photoErr.message)
      }
    }

    try {
      const loadCategory = async (urls, label) => {
        console.log(`[PDF] Loading ${label}: ${urls.length} URLs`)
        const results = await Promise.all(urls.map(async (url, i) => {
          const buf = await fetchBuffer(url)
          if (buf) {
            console.log(`[PDF] ${label}[${i}] ✓ loaded (${buf.length} bytes)`)
          } else {
            console.error(`[PDF] ${label}[${i}] ✗ FAILED — slot will show placeholder`)
          }
          return buf
        }))
        return results
      }

      if (imageUrls?.hairstyles?.length || imageUrls?.outfits?.length || imageUrls?.eyewear?.length) {
        pdfImages.hairstyles = await loadCategory(imageUrls.hairstyles || [], 'hairstyles')
        pdfImages.outfits    = await loadCategory(imageUrls.outfits    || [], 'outfits')
        pdfImages.eyewear    = await loadCategory(imageUrls.eyewear    || [], 'eyewear')
      } else {
        const results = await fetchAllImages(data, gender)
        pdfImages.hairstyles = results.buffers.hairstyles || []
        pdfImages.outfits    = results.buffers.outfits    || []
        pdfImages.eyewear    = results.buffers.eyewear    || []
      }

      // Ensure 2 distinct hairstyle images for pages 3 and 10
      if (pdfImages.hairstyles.length < 2) {
        try {
          const groomingCut = data?.grooming?.haircut || 'textured quiff fade hairstyle male'
          const altQuery    = `${groomingCut} side profile barbershop`
          console.log('[PDF] Fetching alt hairstyle image with query:', altQuery)
          const altResults  = await fetchAllImages({ grooming: { haircut: altQuery } }, gender)
          const altBufs     = altResults?.buffers?.hairstyles || []
          if (altBufs.length > 0) {
            pdfImages.hairstyles.push(altBufs[0])
            console.log('[PDF] Alt hairstyle image loaded OK')
          }
        } catch(e2) {
          console.warn('[PDF] Alt hairstyle fetch failed:', e2.message)
        }
      }

      // Ensure 2 eyewear images — retry with a broader query if only 1 loaded
      if (pdfImages.eyewear.filter(Boolean).length < 2) {
        try {
          console.log('[PDF] Only', pdfImages.eyewear.filter(Boolean).length, 'eyewear image(s) — fetching additional')
          const eyeAlt = await fetchAllImages(
            { body_harmony: { shape: 'mens eyewear frames square round face' } },
            gender
          )
          const eyeAltBufs = eyeAlt?.buffers?.eyewear || []
          for (let i = 0; i < 2; i++) {
            if (!pdfImages.eyewear[i] && eyeAltBufs.length > 0) {
              pdfImages.eyewear[i] = eyeAltBufs.shift()
              console.log('[PDF] Eyewear slot', i, 'filled with alt image')
            }
          }
        } catch(e3) {
          console.warn('[PDF] Eyewear alt fetch failed:', e3.message)
        }
      }

      console.log('[PDF] Final image counts:', {
        hairstyles: pdfImages.hairstyles.length,
        outfits:    pdfImages.outfits.length,
        eyewear:    pdfImages.eyewear.length,
      })

    } catch(e) {
      console.error('[PDF] Image prep failed:', e.message)
    }

    // ── Page counter ────────────────────────────────────────
    let pageNum = 0
    doc.on('pageAdded', () => {
      pageNum++
      if (pageNum > 1) drawBase(doc, pageNum - 1)
    })

    // ════════════════════════════════════════════════════════
    // PAGE 1 — COVER
    // ════════════════════════════════════════════════════════
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C_BLACK)
    doc.rect(PAGE_W * 0.65, 0, PAGE_W * 0.35, PAGE_H).fill(C_CHARCOAL)
    doc.rect(PAGE_W * 0.65 - 0.5, 0, 0.5, PAGE_H).fill(C_GOLD)
    doc.rect(0, PAGE_H - 3, PAGE_W, 3).fill(C_GOLD)
    doc.rect(0, 0, PAGE_W, 3).fill(C_GOLD)

    // Right panel — client photo or decorative circles fallback
    const panelX = PAGE_W * 0.65
    const panelW = PAGE_W * 0.35
    const cx     = panelX + panelW / 2
    const cy     = PAGE_H / 2

    if (clientPhotoBuf) {
      // ── Photo version ──────────────────────────────────────
      // Photo fills the right panel with a circular crop for a
      // polished, editorial look. Gold ring frames the circle.

      const photoR    = Math.min(panelW, PAGE_H) * 0.36   // radius — fits comfortably in panel
      const photoDiam = photoR * 2
      const photoX    = cx - photoR
      const photoY    = cy - photoR

      // Subtle dark vignette behind photo so it blends with panel
      doc.circle(cx, cy, photoR + 2).fill('#0D0D0D')

      // Circular clip mask — clip to circle, draw image, restore
      try {
        doc.save()
        doc.circle(cx, cy, photoR).clip()
        doc.image(clientPhotoBuf, photoX, photoY, {
          width:  photoDiam,
          height: photoDiam,
          cover:  [photoDiam, photoDiam],
        })
        doc.restore()
      } catch (e) {
        console.error('[PDF] Cover photo render failed:', e.message)
        // Fallback — draw circles if clip/image fails
        doc.restore()
        for (const r of [50, 65, 82]) {
          doc.circle(cx, cy, r).lineWidth(0.3).strokeColor(C_GOLD).stroke()
        }
      }

      // Gold ring around the photo circle
      doc.circle(cx, cy, photoR + 2)
        .lineWidth(1.5).strokeColor(C_GOLD).stroke()
      // Outer decorative rings
      doc.circle(cx, cy, photoR + 14)
        .lineWidth(0.4).strokeColor(C_GOLD).strokeOpacity(0.4).stroke()
      doc.circle(cx, cy, photoR + 26)
        .lineWidth(0.2).strokeColor(C_GOLD).strokeOpacity(0.2).stroke()

      // Small name tag below photo circle
      doc.fillColor(C_GOLD).fontSize(7).font('Helvetica-Bold')
        .text((client?.name || '').toUpperCase(), panelX, cy + photoR + 18,
          { width: panelW, align: 'center', characterSpacing: 1.5 })

    } else {
      // ── No photo — decorative circles fallback ─────────────
      for (const r of [50, 65, 82]) {
        doc.circle(cx, cy, r).lineWidth(0.3).strokeColor(C_GOLD).stroke()
      }
    }

    // Brand tag top-left
    doc.fillColor(C_GOLD).fontSize(9).font('Helvetica-Bold')
      .text('PEAK PERFECTION', ML, 65)
    doc.fillColor(C_GOLD).fontSize(8).font('Helvetica')
      .text('www.peakperfection.style', ML, 22)

    // Headline — stacked top-down from a fixed anchor
    const headlineBase = PAGE_H * 0.62
    doc.fillColor(C_GOLD).fontSize(52).font('Helvetica-Bold')
      .text('BLUEPRINT', ML, headlineBase - 116, { lineBreak: false })
    doc.fillColor(C_WHITE).fontSize(52).font('Helvetica-Bold')
      .text('STYLE', ML, headlineBase - 58, { lineBreak: false })
    doc.fillColor(C_WHITE).fontSize(52).font('Helvetica-Bold')
      .text('PERSONAL', ML, headlineBase, { lineBreak: false })

    // Rule + client block below headline
    doc.moveTo(ML, headlineBase - 130).lineTo(200, headlineBase - 130)
      .lineWidth(0.5).strokeColor(C_GOLD).stroke()
    doc.fillColor(C_MID_GRAY).fontSize(8).font('Helvetica')
      .text('PREPARED FOR', ML, headlineBase - 148)
    doc.fillColor(C_WHITE).fontSize(26).font('Helvetica-Bold')
      .text(client?.name || 'Client', ML, headlineBase - 172)
    doc.fillColor(C_MID_GRAY).fontSize(9).font('Helvetica')
      .text(
        new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        ML, headlineBase - 195
      )

    // ════════════════════════════════════════════════════════
    // PAGE 2 — STYLE PROFILE
    // FIX: entire page built top-down from y=118
    // ════════════════════════════════════════════════════════
    doc.addPage()
    drawHeader(doc, '01  —  STYLE PROFILE', 'Style Identity')

    // ── Style Profile — fully top-down from y=118 ─────────────

    let spY = 118  // top-down cursor starts just below header rule

    // Vision callout box (if archetype description exists)
    const archDesc = data.meta?.archetype_description || ''
    if (archDesc) {
      // Measure vision text height AFTER setting font/size to match render exactly
      doc.fontSize(10).font('Helvetica')
      const visionTextH = doc.heightOfString(archDesc, { width: 456, lineGap: 3 })
      const visionBoxH  = visionTextH + 36  // 10pt top padding + label + 10pt gap + text + 6pt bottom
      doc.rect(ML, spY, 3, visionBoxH).fill(C_GOLD)
      doc.rect(ML + 3, spY, CONTENT_W - 3, visionBoxH).fill(C_BG_ALT)
      doc.fillColor(C_BLACK).fontSize(10).font('Helvetica-Bold')
        .text('The Vision', ML + 15, spY + 8)
      doc.fillColor(C_DARK_GRAY).fontSize(10).font('Helvetica')
        .text(archDesc, ML + 15, spY + 22, { width: 456, lineGap: 3 })
      spY += visionBoxH + 16
    }

    // Overview paragraph
    const overview = data.style_identity?.overview || ''
    if (overview) {
      doc.fillColor(C_DARK_GRAY).fontSize(10).font('Helvetica')
        .text(overview, ML, spY, { width: CONTENT_W, lineGap: 4 })
      spY += doc.heightOfString(overview, { width: CONTENT_W, lineGap: 4 }) + 14
    }

    // Lifestyle strategy paragraph
    const lifestyle = data.style_identity?.lifestyle_strategy || ''
    if (lifestyle) {
      doc.fillColor(C_DARK_GRAY).fontSize(10).font('Helvetica')
        .text(lifestyle, ML, spY, { width: CONTENT_W, lineGap: 4 })
      spY += doc.heightOfString(lifestyle, { width: CONTENT_W, lineGap: 4 }) + 18
    }

    // Divider above badges
    doc.moveTo(ML, spY).lineTo(PAGE_W - MR, spY)
      .lineWidth(0.3).strokeColor(C_RULE).stroke()
    spY += 14

    // Archetype badges side by side
    const BADGE_W = 220
    const BADGE_H = 44
    ;[
      { x: ML,           label: 'PRIMARY ARCHETYPE',   value: data.meta?.archetype_primary   || 'Classic Minimalist' },
      { x: ML + BADGE_W + 15, label: 'SECONDARY ARCHETYPE', value: data.meta?.archetype_secondary || 'Effortless Natural'  },
    ].forEach(({ x, label, value }) => {
      doc.rect(x, spY, BADGE_W, BADGE_H).fill(C_BLACK)
      doc.rect(x, spY, BADGE_W, BADGE_H).lineWidth(0.8).strokeColor(C_GOLD).stroke()
      doc.fillColor(C_MID_GRAY).fontSize(6).font('Helvetica').text(label, x + 10, spY + 8)
      doc.fillColor(C_GOLD).fontSize(10).font('Helvetica-Bold').text(value, x + 10, spY + BADGE_H - 20)
    })
    spY += BADGE_H + 14

    // Divider below badges
    doc.moveTo(ML, spY).lineTo(PAGE_W - MR, spY)
      .lineWidth(0.3).strokeColor(C_RULE).stroke()
    spY += 12

    // Style word pills
    const styleWords = data.meta?.style_words || []
    let pillX = ML
    styleWords.forEach(word => {
      const pw = doc.widthOfString(word.toUpperCase(), { fontSize: 7 }) + 22
      doc.rect(pillX, spY, pw, 19).lineWidth(0.5).strokeColor(C_GOLD).stroke()
      doc.fillColor(C_GOLD).fontSize(7).font('Helvetica-Bold')
        .text(word.toUpperCase(), pillX + 11, spY + 6)
      pillX += pw + 8
    })

    // ═══════════════════════════════════════════════════
    // PAGE 3 — HAIR REFERENCE IMAGE (top-down)
    // ═══════════════════════════════════════════════════

    doc.addPage()

    // Descriptor text — starts at y=38, just below running header
    const hairDesc = 'This style is selected based on face shape, hair texture, and desired maintenance level.'
    doc.fillColor(C_LIGHT_GRAY).fontSize(8).font('Helvetica')
      .text(hairDesc, ML, 38, { width: CONTENT_W, align: 'center' })

    const hairDescH   = doc.heightOfString(hairDesc, { width: CONTENT_W })
    const hairCapY    = 38 + hairDescH + 8

    // Caption label just below descriptor
    doc.fillColor(C_LIGHT_GRAY).fontSize(6).font('Helvetica')
      .text('RECOMMENDED HAIRSTYLE', ML, hairCapY, { width: CONTENT_W, align: 'center' })

    // Image starts 14pts below caption label
    const hairImgW  = 380
    const hairImgX  = (PAGE_W - hairImgW) / 2
    const hairImgY  = hairCapY + 14
    const hairImgH  = PAGE_H - hairImgY - 85

    if (pdfImages?.hairstyles?.[0]) {
      try {
        doc.save()
        doc.rect(hairImgX, hairImgY, hairImgW, hairImgH).clip()
        doc.image(pdfImages.hairstyles[0], hairImgX, hairImgY, {
          width: hairImgW, height: hairImgH, cover: [hairImgW, hairImgH]
        })
        doc.restore()
        doc.rect(hairImgX, hairImgY, hairImgW, hairImgH)
          .lineWidth(1.2).strokeColor(C_GOLD).stroke()
      } catch(e) {
        doc.rect(hairImgX, hairImgY, hairImgW, hairImgH)
          .lineWidth(1.2).strokeColor(C_GOLD).stroke()
      }
    } else {
      doc.rect(hairImgX, hairImgY, hairImgW, hairImgH)
        .lineWidth(1.2).strokeColor(C_GOLD).stroke()
    }

    // Footer anchored to page bottom — section tag + subtitle + rule
    doc.moveTo(ML, PAGE_H - 76).lineTo(PAGE_W - MR, PAGE_H - 76)
      .lineWidth(0.3).strokeColor(C_RULE).stroke()
    doc.fillColor(C_MID_GRAY).fontSize(9).font('Helvetica')
      .text('Hair Reference — recommended hairstyle based on face shape and hair type', ML, PAGE_H - 65)
    doc.fillColor(C_GOLD).fontSize(7).font('Helvetica-Bold')
      .text('01  —  STYLE PROFILE', ML, PAGE_H - 50)

    // ════════════════════════════════════════════════════════
    // PAGE 4 — COLOR PALETTE
    // FIX: swatches top-down from HEADER_BASE,
    //      strategy text flows down from swatches
    // ════════════════════════════════════════════════════════
    doc.addPage()
    drawHeader(doc, '02  —  COLOR PALETTE', 'Your Palette')

    let y = HEADER_BASE

    // Colour swatches row
    const palette  = data.palette || []
    const swatchW  = Math.floor(CONTENT_W / Math.max(palette.length, 6)) - 8
    const swatchH  = 62
    let   swatchX  = ML

    palette.forEach(color => {
      // Swatch block
      doc.rect(swatchX, y, swatchW, swatchH).fill(color.hex || '#CCCCCC')
      doc.rect(swatchX, y, swatchW, swatchH).lineWidth(0.4).strokeColor(C_RULE).stroke()
      // Label + hex below swatch
      doc.fillColor(C_DARK_GRAY).fontSize(7).font('Helvetica-Bold')
        .text(color.label || '', swatchX, y + swatchH + 6, { width: swatchW, align: 'center' })
      doc.fillColor(C_MID_GRAY).fontSize(6).font('Helvetica')
        .text(color.hex || '', swatchX, y + swatchH + 17, { width: swatchW, align: 'center' })
      doc.fillColor(C_ACCENT).fontSize(6).font('Helvetica-Bold')
        .text((color.role || '').toUpperCase(), swatchX, y + swatchH + 27,
          { width: swatchW, align: 'center' })
      swatchX += swatchW + 8
    })

    y += swatchH + 42  // swatch height + label block

    // Divider
    doc.moveTo(ML, y).lineTo(PAGE_W - MR, y).lineWidth(0.3).strokeColor(C_RULE).stroke()
    y += 14

    // Strategy paragraphs
    const strategyRows = [
      ['BASE TONES  60%', 'Ivory and Warm Sand form the neutral foundation of every outfit. These go on your body most — t-shirts, casual shirts, light trousers.'],
      ['MID TONES  30%',  'Tan and Camel add warmth and depth. These are your layering pieces — knitwear, overshirts, outerwear that sits on top of the base.'],
      ['ANCHOR  10%',     'Charcoal and Ink are the punctuation marks. Use for trousers, footwear, belts, and bags. These ground the entire outfit.'],
    ]
    strategyRows.forEach(([key, val]) => {
      doc.fillColor(C_GOLD).fontSize(7).font('Helvetica-Bold').text(key, ML, y)
      y += 12
      doc.fillColor(C_DARK_GRAY).fontSize(10).font('Helvetica')
        .text(val, ML, y, { width: CONTENT_W, lineGap: 3 })
      y += doc.heightOfString(val, { width: CONTENT_W, lineGap: 3 }) + 14
      doc.moveTo(ML, y).lineTo(PAGE_W - MR, y).lineWidth(0.3).strokeColor(C_RULE).stroke()
      y += 14
    })

    // Colors to avoid
    doc.fillColor(C_MID_GRAY).fontSize(7).font('Helvetica-Bold').text('COLORS TO AVOID', ML, y)
    y += 14
    const avoidColors = data.palette_avoid || []
    avoidColors.forEach(item => {
      doc.rect(ML, y + 3, 5, 5).fill('#C62828')
      doc.fillColor(C_DARK_GRAY).fontSize(10).font('Helvetica')
        .text(item, ML + 12, y, { width: CONTENT_W - 12, lineGap: 3 })
      y += doc.heightOfString(item, { width: CONTENT_W - 12, lineGap: 3 }) + 10
    })

    // ════════════════════════════════════════════════════════
    // PAGE 5 — BODY HARMONY
    // FIX: top-down cursor from HEADER_BASE throughout
    // ════════════════════════════════════════════════════════
    doc.addPage()
    drawHeader(doc, '03  —  BODY HARMONY', 'Fit & Proportion')

    y = HEADER_BASE

    doc.fillColor(C_MID_GRAY).fontSize(8).font('Helvetica-Bold').text('BODY SHAPE', ML, y)
    y += 14
    doc.fillColor(C_BLACK).fontSize(14).font('Helvetica-Bold')
      .text(data.body_harmony?.shape || '', ML, y)
    y += 26

    doc.fillColor(C_MID_GRAY).fontSize(8).font('Helvetica-Bold').text('OBJECTIVE', ML, y)
    y += 12
    const objective = data.body_harmony?.objective || ''
    doc.fillColor(C_DARK_GRAY).fontSize(10).font('Helvetica')
      .text(objective, ML, y, { width: CONTENT_W, lineGap: 4 })
    y += doc.heightOfString(objective, { width: CONTENT_W, lineGap: 4 }) + 16

    doc.moveTo(ML, y).lineTo(PAGE_W - MR, y).lineWidth(0.3).strokeColor(C_RULE).stroke()
    y += 14

    // Two-column: KEY PRINCIPLES | WHAT TO AVOID
    const colW    = 230
    const col2X   = ML + colW + 20
    const col2W   = CONTENT_W - colW - 20

    doc.fillColor(C_MID_GRAY).fontSize(8).font('Helvetica-Bold').text('KEY PRINCIPLES', ML,    y)
    doc.fillColor(C_MID_GRAY).fontSize(8).font('Helvetica-Bold').text('WHAT TO AVOID',  col2X, y)
    y += 16

    const principles = data.body_harmony?.principles || []
    const avoids     = data.body_harmony?.avoid      || []
    const maxRows    = Math.max(principles.length, avoids.length)
    for (let i = 0; i < maxRows; i++) {
      const leftH  = principles[i]
        ? doc.heightOfString(principles[i], { width: colW - 14, lineGap: 3 }) + 4
        : 0
      const rightH = avoids[i]
        ? doc.heightOfString(avoids[i],     { width: col2W - 14, lineGap: 3 }) + 4
        : 0
      const rowH = Math.max(leftH, rightH, 18)

      if (principles[i]) {
        doc.fillColor(C_GOLD).fontSize(9).font('Helvetica-Bold').text('—', ML, y)
        doc.fillColor(C_DARK_GRAY).fontSize(9.5).font('Helvetica')
          .text(principles[i], ML + 14, y, { width: colW - 14, lineGap: 3 })
      }
      if (avoids[i]) {
        doc.rect(col2X, y + 3, 5, 5).fill('#C62828')
        doc.fillColor(C_DARK_GRAY).fontSize(9.5).font('Helvetica')
          .text(avoids[i], col2X + 12, y, { width: col2W - 12, lineGap: 3 })
      }
      y += rowH + 8
    }

    y += 10
    // Golden rule callout
    const goldenRuleText = 'Fit is the single most important element of style. A well-fitted basic always outperforms an expensive ill-fitted garment.'
    const grH = doc.heightOfString(goldenRuleText, { width: 462, lineGap: 3 }) + 28
    doc.rect(ML, y, 3, grH).fill(C_GOLD)
    doc.rect(ML + 3, y, CONTENT_W - 3, grH).fill(C_BG_ALT)
    doc.fillColor(C_BLACK).fontSize(11).font('Helvetica-Bold').text('The Golden Rule', ML + 15, y + 10)
    doc.fillColor(C_DARK_GRAY).fontSize(10).font('Helvetica')
      .text(goldenRuleText, ML + 15, y + 26, { width: 462, lineGap: 3 })

    // ════════════════════════════════════════════════════════
    // PAGE 6 — CAPSULE WARDROBE
    // FIX: top-down cursor from HEADER_BASE
    // ════════════════════════════════════════════════════════
    doc.addPage()
    drawHeader(doc, '04  —  CAPSULE WARDROBE', 'The Foundation Pieces')

    y = HEADER_BASE

    const capsuleCategories = [
      { label: 'TOPS',      items: data.capsule?.tops      || [] },
      { label: 'BOTTOMS',   items: data.capsule?.bottoms   || [] },
      { label: 'OUTERWEAR', items: data.capsule?.outerwear || [] },
      { label: 'FOOTWEAR',  items: data.capsule?.footwear  || [] },
    ]

    capsuleCategories.forEach(({ label, items }) => {
      if (!items.length) return
      doc.fillColor(C_GOLD).fontSize(7).font('Helvetica-Bold').text(label, ML, y)
      y += 14
      items.forEach((item, i) => {
        const bg = i % 2 === 0 ? C_BG_ALT : C_WHITE
        const rowH = 20
        doc.rect(ML, y, CONTENT_W, rowH).fill(bg)
        doc.moveTo(ML, y).lineTo(ML + CONTENT_W, y).lineWidth(0.3).strokeColor(C_RULE).stroke()
        doc.fillColor(C_MID_GRAY).fontSize(8).font('Helvetica-Bold').text(item.qty   || '', ML,       y + 5)
        doc.fillColor(C_DARK_GRAY).fontSize(9).font('Helvetica')     .text(item.name  || '', ML + 35,  y + 5)
        doc.fillColor(C_ACCENT).fontSize(8).font('Helvetica')        .text(item.colors || '', ML + 235, y + 5)
        y += rowH
      })
      y += 12
    })

    // ════════════════════════════════════════════════════════
    // PAGE 7 — OUTFIT RECOMMENDATIONS
    // FIX: cards anchored top-down from HEADER_BASE
    // ════════════════════════════════════════════════════════
    doc.addPage()
    drawHeader(doc, '05  —  OUTFIT RECOMMENDATIONS', 'Complete Looks')

    const CARD_W   = 228
    const CARD_H   = 252
    const CARD_GAP = 14
    const outfits  = data.outfits || []

    // 2×2 grid, top-down from HEADER_BASE
    const cardGrid = [
      { x: ML,                     y: HEADER_BASE,                    idx: 0 },
      { x: ML + CARD_W + CARD_GAP, y: HEADER_BASE,                    idx: 1 },
      { x: ML,                     y: HEADER_BASE + CARD_H + CARD_GAP, idx: 2 },
      { x: ML + CARD_W + CARD_GAP, y: HEADER_BASE + CARD_H + CARD_GAP, idx: 3 },
    ]

    cardGrid.forEach(({ x, y: cy, idx }) => {
      const outfit   = outfits[idx]
      if (!outfit) return
      const isDark   = idx % 2 === 0
      const bgColor  = isDark ? C_CHARCOAL : C_CREAM
      const txtColor = isDark ? C_WHITE     : C_BLACK
      const subColor = isDark ? C_LIGHT_GRAY : C_MID_GRAY

      doc.rect(x, cy, CARD_W, CARD_H).fill(bgColor)
      doc.rect(x, cy + CARD_H - 4, CARD_W, 4).fill(C_GOLD)  // bottom gold bar
      doc.rect(x, cy, 3, CARD_H - 4).fill(C_GOLD)             // left gold bar

      // Content flows top-down inside card
      let cardY = cy + 14
      doc.fillColor(C_GOLD).fontSize(6).font('Helvetica-Bold')
        .text((outfit.occasion || '').toUpperCase(), x + 14, cardY, { width: CARD_W - 28 })
      cardY += 14
      doc.fillColor(txtColor).fontSize(12).font('Helvetica-Bold')
        .text(outfit.name || '', x + 14, cardY, { width: CARD_W - 28 })
      cardY += 18
      doc.moveTo(x + 14, cardY).lineTo(x + CARD_W - 14, cardY)
        .lineWidth(0.4).strokeColor(isDark ? C_GOLD : C_RULE).stroke()
      cardY += 10

      ;(outfit.items || []).slice(0, 4).forEach(item => {
        doc.fillColor(subColor).fontSize(9).font('Helvetica')
          .text(`— ${item}`, x + 14, cardY, { width: CARD_W - 28 })
        cardY += 14
      })

      if (outfit.note) {
        cardY += 6
        doc.fillColor(C_GOLD).fontSize(8).font('Helvetica-Oblique')
          .text(outfit.note, x + 14, cardY, { width: CARD_W - 28 })
      }

      doc.rect(x, cy, CARD_W, CARD_H).lineWidth(0.6).strokeColor(C_GOLD).stroke()
    })

    // Combination principle sits below the 2×2 grid
    const comboPrincipleY = HEADER_BASE + CARD_H * 2 + CARD_GAP + 16
    doc.moveTo(ML, comboPrincipleY).lineTo(PAGE_W - MR, comboPrincipleY)
      .lineWidth(0.3).strokeColor(C_RULE).stroke()
    doc.fillColor(C_GOLD).fontSize(7).font('Helvetica-Bold')
      .text('COMBINATION PRINCIPLE', ML, comboPrincipleY + 8)
    doc.fillColor(C_DARK_GRAY).fontSize(9).font('Helvetica')
      .text(
        'One structured anchor + one neutral base + one texture or layer. Any top from your capsule pairs with any bottom.',
        ML, comboPrincipleY + 20, { width: CONTENT_W }
      )

    // ═══════════════════════════════════════════════════
    // PAGE 8 — LOOK BOOK (4 outfit images, no border)
    // ═══════════════════════════════════════════════════

    doc.addPage()

    // Page title block — anchored from TOP
    doc.fillColor(C_GOLD).fontSize(7).font('Helvetica-Bold')
      .text('05  —  OUTFIT VISUAL REFERENCES', ML, 38)
    doc.fillColor(C_BLACK).fontSize(26).font('Helvetica-Bold')
      .text('Look Book', ML, 50)
    doc.moveTo(ML, 88).lineTo(ML + 75, 88).lineWidth(1.2).strokeColor(C_GOLD).stroke()
    doc.moveTo(ML + 79, 88).lineTo(PAGE_W - MR, 88).lineWidth(0.3).strokeColor(C_RULE).stroke()
    doc.fillColor(C_MID_GRAY).fontSize(8).font('Helvetica')
      .text('Reference images matched to occasion, body type, and colour direction.', ML, 96, { width: CONTENT_W })

    // Grid constants — all top-down from y=114
    const PHOTO_W     = 228
    const PHOTO_H     = 270
    const PHOTO_GAP   = 12
    const CAPTION_H   = 14
    const GRID_START  = 114   // top of first caption row

    const photoGrid = [
      { x: ML,                      y: GRID_START,                                  idx: 0 },
      { x: ML + PHOTO_W + PHOTO_GAP, y: GRID_START,                                  idx: 1 },
      { x: ML,                      y: GRID_START + CAPTION_H + PHOTO_H + PHOTO_GAP, idx: 2 },
      { x: ML + PHOTO_W + PHOTO_GAP, y: GRID_START + CAPTION_H + PHOTO_H + PHOTO_GAP, idx: 3 },
    ]

    photoGrid.forEach(({ x, y, idx }) => {
      const outfit  = (data.outfits || [])[idx]
      const buf     = (pdfImages?.outfits || [])[idx]
      const caption = outfit?.name || `Outfit ${idx + 1}` 

      // Caption label ABOVE image
      doc.fillColor(C_LIGHT_GRAY).fontSize(6).font('Helvetica')
        .text(caption.toUpperCase(), x, y, { width: PHOTO_W, align: 'center' })

      const imgY = y + CAPTION_H
      if (!buf) {
        // Empty placeholder — NO gold border, just a subtle background
        doc.rect(x, imgY, PHOTO_W, PHOTO_H).fill(C_BG_ALT)
      } else {
        try {
          // Force resize to exactly PHOTO_W × PHOTO_H regardless of source dimensions
          // cover:[w,h] crops to fill the box — no blank edges, no distortion
          doc.save()
          doc.rect(x, imgY, PHOTO_W, PHOTO_H).clip()
          doc.image(buf, x, imgY, { width: PHOTO_W, height: PHOTO_H, cover: [PHOTO_W, PHOTO_H] })
          doc.restore()
          // NO border drawn — clean edge, no gold rectangle
        } catch(e) {
          console.error('[PDF] Lookbook image embed failed idx=' + idx + ':', e.message)
          doc.rect(x, imgY, PHOTO_W, PHOTO_H).fill(C_BG_ALT)
        }
      }
    })

    // Source attribution — anchored below the second row of images
    const sourceY = GRID_START + CAPTION_H + PHOTO_H + PHOTO_GAP + CAPTION_H + PHOTO_H + 10
    doc.fillColor(C_LIGHT_GRAY).fontSize(7).font('Helvetica')
      .text(
        'Images sourced from Pinterest based on style archetype, body type, and occasion.',
        ML, sourceY, { width: CONTENT_W, align: 'center' }
      )

    // ════════════════════════════════════════════════════════
    // PAGE 9 — GROOMING PROTOCOL
    // FIX: table rows rendered top-down from HEADER_BASE
    // ════════════════════════════════════════════════════════
    doc.addPage()
    drawHeader(doc, '06  —  GROOMING PROTOCOL', 'Hair, Skin & Grooming')

    y = HEADER_BASE

    const groomingRows = [
      { label: 'HAIRCUT',   value: data.grooming?.haircut   || '' },
      { label: 'SHAVE',     value: data.grooming?.shave     || '' },
      { label: 'SKINCARE',  value: data.grooming?.skincare  || '' },
      { label: 'FRAGRANCE', value: data.grooming?.fragrance || '' },
    ]

    groomingRows.forEach(row => {
      if (!row.value) return

      // Measure text at the EXACT font/size used to render, against exact available width
      doc.fontSize(10).font('Helvetica')
      const textH = doc.heightOfString(row.value, { width: 350, lineGap: 4 })
      const rowH  = textH + 20  // 10pt top padding + 10pt bottom padding — no artificial minimum

      // Label cell
      doc.rect(ML, y, 110, rowH).fill(C_BG_ALT)
      doc.rect(ML, y, 110, rowH).lineWidth(0.3).strokeColor(C_RULE).stroke()
      // Vertically centre the label text in the cell
      doc.fillColor(C_GOLD).fontSize(8).font('Helvetica-Bold')
        .text(row.label, ML + 10, y + (rowH / 2) - 5)

      // Value cell
      doc.rect(ML + 110, y, CONTENT_W - 110, rowH).fill(C_WHITE)
      doc.rect(ML + 110, y, CONTENT_W - 110, rowH).lineWidth(0.3).strokeColor(C_RULE).stroke()
      doc.fillColor(C_DARK_GRAY).fontSize(10).font('Helvetica')
        .text(row.value, ML + 120, y + 10, { width: 350, lineGap: 4 })

      y += rowH + 1
    })

    // ═══════════════════════════════════════════════════
    // PAGE 10 — GROOMING HAIR IMAGE (top-down, index [1])
    // ═══════════════════════════════════════════════════

    doc.addPage()

    const groomDesc = 'This cut is specifically selected to complement your face shape and work with your natural hair texture.'
    doc.fillColor(C_LIGHT_GRAY).fontSize(8).font('Helvetica')
      .text(groomDesc, ML, 38, { width: CONTENT_W, align: 'center' })

    const groomDescH  = doc.heightOfString(groomDesc, { width: CONTENT_W })
    const groomCapY   = 38 + groomDescH + 8

    doc.fillColor(C_LIGHT_GRAY).fontSize(6).font('Helvetica')
      .text('RECOMMENDED HAIRSTYLE', ML, groomCapY, { width: CONTENT_W, align: 'center' })

    const groomImgW  = 380
    const groomImgX  = (PAGE_W - groomImgW) / 2
    const groomImgY  = groomCapY + 14
    const groomImgH  = PAGE_H - groomImgY - 85

    // Use hairstyles[1] for a DIFFERENT image than page 3
    // Fall back to hairstyles[0] if only one was fetched
    const groomBuf = pdfImages?.hairstyles?.[1] || pdfImages?.hairstyles?.[0]

    if (groomBuf) {
      try {
        doc.save()
        doc.rect(groomImgX, groomImgY, groomImgW, groomImgH).clip()
        doc.image(groomBuf, groomImgX, groomImgY, {
          width: groomImgW, height: groomImgH, cover: [groomImgW, groomImgH]
        })
        doc.restore()
        doc.rect(groomImgX, groomImgY, groomImgW, groomImgH)
          .lineWidth(1.2).strokeColor(C_GOLD).stroke()
      } catch(e) {
        doc.rect(groomImgX, groomImgY, groomImgW, groomImgH)
          .lineWidth(1.2).strokeColor(C_GOLD).stroke()
      }
    } else {
      doc.rect(groomImgX, groomImgY, groomImgW, groomImgH)
        .lineWidth(1.2).strokeColor(C_GOLD).stroke()
    }

    doc.moveTo(ML, PAGE_H - 76).lineTo(PAGE_W - MR, PAGE_H - 76)
      .lineWidth(0.3).strokeColor(C_RULE).stroke()
    doc.fillColor(C_MID_GRAY).fontSize(9).font('Helvetica')
      .text('Hairstyle Reference — selected based on face shape, hair type, and recommended cut', ML, PAGE_H - 65)
    doc.fillColor(C_GOLD).fontSize(7).font('Helvetica-Bold')
      .text('06  —  GROOMING PROTOCOL', ML, PAGE_H - 50)

    // ════════════════════════════════════════════════════════
    // PAGE 11 — DO & AVOID
    // FIX: header row + data rows rendered top-down
    // ════════════════════════════════════════════════════════
    doc.addPage()
    drawHeader(doc, '07  —  STYLE RULES', 'Do & Avoid')

    y = HEADER_BASE

    // Header row
    const doColW   = 240
    const dontColW = CONTENT_W - doColW
    doc.rect(ML,          y, doColW,   28).fill(C_BLACK)
    doc.rect(ML + doColW, y, dontColW, 28).fill(C_DARK_GRAY)
    doc.fillColor(C_GOLD).fontSize(8).font('Helvetica-Bold')
      .text('DO',    ML + 13,          y + 10)
      .text('AVOID', ML + doColW + 13, y + 10)
    y += 28

    const dos   = data.dos   || []
    const donts = data.donts || []
    const maxDoRows = Math.max(dos.length, donts.length)

    for (let i = 0; i < maxDoRows; i++) {
      const doText   = dos[i]   || ''
      const dontText = donts[i] || ''
      const doH      = doText   ? doc.heightOfString(doText,   { width: doColW   - 28, lineGap: 3 }) + 14 : 0
      const dontH    = dontText ? doc.heightOfString(dontText, { width: dontColW - 28, lineGap: 3 }) + 14 : 0
      const rowH     = Math.max(doH, dontH, 34)
      const bg       = i % 2 === 0 ? C_BG_ALT : C_WHITE

      doc.rect(ML, y, CONTENT_W, rowH).fill(bg)
      doc.moveTo(ML, y).lineTo(ML + CONTENT_W, y).lineWidth(0.3).strokeColor(C_RULE).stroke()

      if (doText) {
        doc.rect(ML + 10, y + 12, 5, 5).fill('#2E7D32')
        doc.fillColor(C_DARK_GRAY).fontSize(9).font('Helvetica')
          .text(doText, ML + 22, y + 10, { width: doColW - 28, lineGap: 3 })
      }
      if (dontText) {
        doc.rect(ML + doColW + 10, y + 12, 5, 5).fill('#C62828')
        doc.fillColor(C_DARK_GRAY).fontSize(9).font('Helvetica')
          .text(dontText, ML + doColW + 22, y + 10, { width: dontColW - 28, lineGap: 3 })
      }
      y += rowH
    }

    y += 20
    const quoteText = '"Style is a way to say who you are without having to speak."'
    const quoteH    = doc.heightOfString(quoteText, { width: 462, lineGap: 3 }) + 28
    doc.rect(ML,     y, 3,              quoteH).fill(C_GOLD)
    doc.rect(ML + 3, y, CONTENT_W - 3, quoteH).fill(C_BG_ALT)
    doc.fillColor(C_DARK_GRAY).fontSize(10).font('Helvetica-Oblique')
      .text(quoteText, ML + 15, y + 10, { width: 462, lineGap: 3 })
    doc.fillColor(C_LIGHT_GRAY).fontSize(8).font('Helvetica')
      .text('— Rachel Zoe', ML + 15, y + quoteH - 18)

    // ═══════════════════════════════════════════════════
    // PAGE 12 — EYEWEAR IMAGES (top-down, no border, clean crop)
    // ═══════════════════════════════════════════════════

    doc.addPage()

    // Section label + subtitle at top
    doc.fillColor(C_GOLD).fontSize(7).font('Helvetica-Bold')
      .text('07  —  STYLE RULES', ML, 38)
    doc.fillColor(C_MID_GRAY).fontSize(9).font('Helvetica')
      .text('Eyewear Direction — frames recommended based on face shape',
        ML, 50)
    doc.moveTo(ML, 66)
      .lineTo(PAGE_W - MR, 66)
      .lineWidth(0.3).strokeColor(C_RULE).stroke()

    // Caption labels
    const EYE_CAP_Y = 74
    doc.fillColor(C_LIGHT_GRAY).fontSize(6).font('Helvetica')
      .text('EYEWEAR REFERENCE', ML, EYE_CAP_Y, { width: 220, align: 'center' })
    doc.fillColor(C_LIGHT_GRAY).fontSize(6).font('Helvetica')
      .text('ALTERNATIVE OPTION',
        PAGE_W - MR - 220, EYE_CAP_Y, { width: 220, align: 'center' })

    // Image dimensions — tall portrait, fills most of page
    const EYE_W   = 220
    const EYE_H   = 340
    const EYE_Y   = EYE_CAP_Y + 14   // starts 14pts below caption label
    const eye2X   = PAGE_W - MR - EYE_W

    // Left image — clean clip, no border
    if (pdfImages?.eyewear?.[0]) {
      try {
        doc.save()
        doc.rect(ML, EYE_Y, EYE_W, EYE_H).clip()
        doc.image(pdfImages.eyewear[0], ML, EYE_Y, {
          width: EYE_W, height: EYE_H, cover: [EYE_W, EYE_H]
        })
        doc.restore()
      } catch(e) {
        doc.rect(ML, EYE_Y, EYE_W, EYE_H).fill(C_BG_ALT)
      }
    } else {
      doc.rect(ML, EYE_Y, EYE_W, EYE_H).fill(C_BG_ALT)
    }

    // Right image — clean clip, no border
    if (pdfImages?.eyewear?.[1]) {
      try {
        doc.save()
        doc.rect(eye2X, EYE_Y, EYE_W, EYE_H).clip()
        doc.image(pdfImages.eyewear[1], eye2X, EYE_Y, {
          width: EYE_W, height: EYE_H, cover: [EYE_W, EYE_H]
        })
        doc.restore()
      } catch(e) {
        doc.rect(eye2X, EYE_Y, EYE_W, EYE_H).fill(C_BG_ALT)
      }
    } else {
      doc.rect(eye2X, EYE_Y, EYE_W, EYE_H).fill(C_BG_ALT)
    }

    // Centre label between the two images — sits below both images
    doc.fillColor(C_MID_GRAY).fontSize(8).font('Helvetica-Bold')
      .text('EYEWEAR DIRECTION',
        ML, EYE_Y + EYE_H + 16,
        { width: CONTENT_W, align: 'center' })

    // ════════════════════════════════════════════════════════
    // PAGE 13 — SHOPPING GUIDE
    // FIX: table rendered top-down from HEADER_BASE
    // ════════════════════════════════════════════════════════
    doc.addPage()
    drawHeader(doc, '08  —  SHOPPING GUIDE', 'Where & What to Buy')

    y = HEADER_BASE

    const shoppingItems = data.shopping || []
    // Column widths: # | Item | Brands | Tier
    const shopColW = [30, 160, 190, 95]
    const shopTotalW = shopColW.reduce((a, b) => a + b, 0) + 10

    // Header row
    doc.rect(ML, y, shopTotalW, 28).fill(C_BLACK)
    let hx = ML + 8
    ;['#', 'ITEM', 'BRANDS', 'TIER'].forEach((h, i) => {
      doc.fillColor(C_GOLD).fontSize(8).font('Helvetica-Bold').text(h, hx, y + 10)
      hx += shopColW[i]
    })
    y += 28

    shoppingItems.forEach((item, i) => {
      const rowH = 28
      const bg   = i % 2 === 0 ? C_BG_ALT : C_WHITE
      doc.rect(ML, y, shopTotalW, rowH).fill(bg)
      doc.moveTo(ML, y).lineTo(ML + shopTotalW, y).lineWidth(0.3).strokeColor(C_RULE).stroke()

      let sx = ML + 8
      doc.fillColor(C_MID_GRAY).fontSize(8).font('Helvetica-Bold')
        .text(item.priority || String(i + 1), sx, y + 9)
      sx += shopColW[0]
      doc.fillColor(C_DARK_GRAY).fontSize(9).font('Helvetica')
        .text(item.item || '', sx, y + 9, { width: shopColW[1] - 4 })
      sx += shopColW[1]
      doc.fillColor(C_DARK_GRAY).fontSize(9).font('Helvetica')
        .text(item.brands || '', sx, y + 9, { width: shopColW[2] - 4 })
      sx += shopColW[2]
      doc.fillColor(C_ACCENT).fontSize(8).font('Helvetica-Bold')
        .text(item.tier || '', sx, y + 9)

      y += rowH
    })

    // ════════════════════════════════════════════════════════
    // PAGE 14 — CLOSING
    // ════════════════════════════════════════════════════════
    doc.addPage()
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C_CREAM)
    doc.rect(0, PAGE_H - 3, PAGE_W, 3).fill(C_GOLD)
    doc.rect(0, 0, PAGE_W, 3).fill(C_GOLD)

    // Decorative circles
    for (const r of [80, 105, 130]) {
      doc.circle(PAGE_W / 2, PAGE_H / 2 + 40, r)
        .lineWidth(0.3 - (r - 80) * 0.005)
        .strokeColor(C_GOLD).stroke()
    }

    // Brand block — centred, top half
    const closingCentreY = PAGE_H / 2 - 100
    doc.fillColor(C_GOLD).fontSize(8).font('Helvetica')
      .text('www.peakperfection.style', 60, closingCentreY,
        { width: PAGE_W - 120, align: 'center' })
    doc.fillColor(C_MID_GRAY).fontSize(10).font('Helvetica')
      .text('Personal Style Advisory  ·  ' +
        new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        60, closingCentreY + 16, { width: PAGE_W - 120, align: 'center' })
    doc.fillColor(C_BLACK).fontSize(18).font('Helvetica-Bold')
      .text('Peak Perfection', 60, closingCentreY + 32,
        { width: PAGE_W - 120, align: 'center' })

    doc.moveTo(PAGE_W / 2 - 50, closingCentreY + 58)
      .lineTo(PAGE_W / 2 + 50, closingCentreY + 58)
      .lineWidth(0.5).strokeColor(C_GOLD).stroke()

    // Closing message — below rule
    const closingMsg = data.closing_message || ''
    doc.fillColor(C_DARK_GRAY).fontSize(12).font('Helvetica-Oblique')
      .text(closingMsg, 75, closingCentreY + 70,
        { width: PAGE_W - 150, align: 'center', lineGap: 5 })

    doc.end()
  })
}
