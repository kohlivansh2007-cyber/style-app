import axios from 'axios'

const cache = {}

async function fetchImageFromGoogle(query) {
  const cacheKey = query
  if (cache[cacheKey]) return cache[cacheKey]

  try {
    console.log('[ImageFetcher] Searching via SerpApi:', query)
    
    const searchResponse = await axios.get(
      'https://serpapi.com/search',
      {
        params: {
          api_key: process.env.SERPAPI_KEY,
          engine: 'google_images',
          q: query,
          num: 5,
          safe: 'active'
        },
        timeout: 10000
      }
    )

    const results = searchResponse.data?.images_results
    if (!results || results.length === 0) {
      console.warn('[ImageFetcher] No results for:', query)
      return { url: null, buffer: null }
    }

    for (const item of results.slice(0, 5)) {
      try {
        const imgResponse = await axios.get(item.original, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          }
        })

        const contentType = imgResponse.headers['content-type'] || ''
        if (!contentType.startsWith('image/')) continue
        if (imgResponse.data.byteLength < 10000) continue

        const buffer = Buffer.from(imgResponse.data)
        const result = { url: item.original, buffer }
        cache[cacheKey] = result
        console.log('[ImageFetcher] Success:', query,
          `(${Math.round(buffer.length/1024)}kb)`)
        return result

      } catch (e) {
        continue
      }
    }

    return { url: null, buffer: null }

  } catch (error) {
    console.error('[ImageFetcher] Search failed:', query, error.message)
    return { url: null, buffer: null }
  }
}

export function buildQueries(reportJson, gender) {
  const g = gender === 'female' ? 'woman' : 'men'
  const data = reportJson || {}
  
  const faceShape = data.image_tags?.face_shape || ''
  const hairType = data.image_tags?.hair_type || ''
  const haircutShort = (data.grooming?.haircut || '').split('.')[0].substring(0, 30)

  // FIX 6: Better Pinterest-friendly hair queries
  const hairQuery1 = haircutShort.length > 3
    ? `${g} ${haircutShort} haircut pinterest 2024`
    : `${g} textured fade haircut pinterest`

  const hairQuery2 = `${g} smart casual hairstyle fade pinterest`

  // FIX 6: Better outfit queries - clean and precise
  const outfitQueries = (data.outfits || []).map(outfit => {
    const cleanOccasion = (outfit.occasion || '')
      .split('/')[0].trim().toLowerCase()
      .replace(/[^a-z ]/g, '')
    const firstItem = (outfit.items?.[0] || '')
      .replace(/\([^)]*\)/g, '')
      .replace(/[^a-zA-Z ]/g, '')
      .trim()
      .split(' ').slice(0, 3).join(' ')
    return `${g} ${cleanOccasion} ${firstItem} outfit pinterest`
  })

  // FIX 6: Better eyewear queries
  const eyewearQuery1 = `${g} minimal eyeglasses frames pinterest`
  const eyewearQuery2 = `${g} glasses fashion editorial pinterest`

  return {
    hairstyles: [hairQuery1, hairQuery2],
    outfits: outfitQueries.slice(0, 4),
    eyewear: [eyewearQuery1, eyewearQuery2]
  }
}

export async function fetchAllImages(reportJson, gender) {
  const queries = buildQueries(reportJson, gender)
  
  // Fetch all in parallel
  const [hairstyle1, hairstyle2] = await Promise.all(
    queries.hairstyles.map(q => fetchImageFromGoogle(q))
  )
  
  const outfitResults = await Promise.all(
    queries.outfits.map(q => fetchImageFromGoogle(q))
  )
  
  const [eyewear1, eyewear2] = await Promise.all(
    queries.eyewear.map(q => fetchImageFromGoogle(q))
  )

  return {
    urls: {
      hairstyles: [hairstyle1.url, hairstyle2.url].filter(Boolean),
      outfits: outfitResults.map(r => r.url).filter(Boolean),
      eyewear: [eyewear1.url, eyewear2.url].filter(Boolean)
    },
    buffers: {
      hairstyles: [hairstyle1.buffer, hairstyle2.buffer].filter(Boolean),
      outfits: outfitResults.map(r => r.buffer).filter(Boolean),
      eyewear: [eyewear1.buffer, eyewear2.buffer].filter(Boolean)
    }
  }
}
