import { execFile } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPythonExecutable } from './thumbnail.service.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jyxukgnvceauicdiuyuo.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_s1w00m2nAYGaZW9H5cXfnQ_2J1WO_pi'

export interface DuplicateCheckResult {
  isDuplicate: boolean
  shortcode: string | null
  folderName?: string
  folderId?: string
  reelId?: string
  matchedUrl?: string
  error?: string
}

// In-memory shortcode cache (TTL: 5 minutes) to avoid repeated queries and prevent loop congestion
interface CacheEntry {
  result: DuplicateCheckResult
  expiresAt: number
}
const duplicateCache = new Map<string, CacheEntry>()

export function invalidateDuplicateCache(shortcode?: string) {
  if (shortcode) {
    for (const key of duplicateCache.keys()) {
      if (key.includes(shortcode)) {
        duplicateCache.delete(key)
      }
    }
  } else {
    duplicateCache.clear()
  }
}

const RESERVED_SLUGS = new Set([
  'reel', 'reels', 'p', 'tv', 'share', 'explore', 'stories', 'videos', 'audio',
  'channel', 'direct', 'feed', 'accounts', 'developer', 'about', 'legal'
])

export function extractShortcode(urlOrCode: string): string | null {
  if (!urlOrCode) return null
  const clean = urlOrCode.trim()
  const match = clean.match(/\/(?:reels?|p|tv|share\/reel)\/([A-Za-z0-9_-]+)/)
  const candidate = match ? match[1] : clean.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '')
  if (candidate && candidate.length >= 5 && !RESERVED_SLUGS.has(candidate.toLowerCase()) && /^[A-Za-z0-9_-]+$/.test(candidate)) {
    return candidate
  }
  return null
}

/**
 * Direct, fast Node.js fetch with strict 3s timeout
 */
export async function runNodeDuplicateCheck(
  urlOrShortcode: string,
  userId?: string,
  token?: string
): Promise<DuplicateCheckResult> {
  const shortcode = extractShortcode(urlOrShortcode)
  if (!shortcode) {
    return { isDuplicate: false, shortcode: null }
  }

  const authToken = token || SUPABASE_KEY
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }

  const queryParams = [
    'select=id,folder_id,instagram_url,user_id,folders!folder_id(id,name,is_deleted)',
    'is_deleted=eq.false',
    `instagram_url=ilike.*${encodeURIComponent(shortcode)}*`,
    'limit=1'
  ]
  if (userId) {
    queryParams.push(`user_id=eq.${userId}`)
  }

  const url = `${SUPABASE_URL}/rest/v1/reels?${queryParams.join('&')}`

  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(3500)
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0]
        let folderName = item.folders?.name
        if (!folderName && Array.isArray(item.folders) && item.folders.length > 0) {
          folderName = item.folders[0]?.name
        }

        const folderId = item.folder_id
        if (!folderName && folderId) {
          try {
            const fRes = await fetch(`${SUPABASE_URL}/rest/v1/folders?select=name&id=eq.${folderId}&limit=1`, {
              headers,
              signal: AbortSignal.timeout(2000)
            })
            if (fRes.ok) {
              const fData = await fRes.json()
              if (Array.isArray(fData) && fData.length > 0) {
                folderName = fData[0]?.name
              }
            }
          } catch {
            // Non-fatal
          }
        }

        return {
          isDuplicate: true,
          shortcode,
          folderName: folderName || 'Folder',
          folderId,
          reelId: item.id,
          matchedUrl: item.instagram_url
        }
      }
    }
  } catch (err: any) {
    console.warn('[Duplicate Service Node Query Warning]:', err.message || err)
  }

  return { isDuplicate: false, shortcode }
}

/**
 * Python check_duplicate.py execution with 4s timeout
 */
export async function runPythonDuplicateCheck(
  urlOrShortcode: string,
  userId?: string,
  token?: string
): Promise<DuplicateCheckResult> {
  const pythonBin = getPythonExecutable()
  const scriptPath = path.resolve(__dirname, '../../scripts/check_duplicate.py')

  const args = [scriptPath, urlOrShortcode]
  if (userId) args.push(userId)
  if (token) args.push(token)

  return new Promise((resolve) => {
    execFile(
      pythonBin,
      args,
      {
        timeout: 4000,
        env: {
          ...process.env,
          SUPABASE_URL,
          SUPABASE_ANON_KEY: SUPABASE_KEY
        }
      },
      (error, stdout) => {
        if (!error && stdout.trim()) {
          try {
            const parsed = JSON.parse(stdout.trim())
            return resolve(parsed)
          } catch {
            // Ignore
          }
        }
        resolve(runNodeDuplicateCheck(urlOrShortcode, userId, token))
      }
    )
  })
}

/**
 * Main duplicate checking function:
 * 1. Checks memory cache (0ms response)
 * 2. Runs fast direct Node query (takes ~150ms)
 * 3. Falls back to Python script only if direct query errored
 */
export async function checkDuplicate(
  urlOrShortcode: string,
  userId?: string,
  token?: string
): Promise<DuplicateCheckResult> {
  const shortcode = extractShortcode(urlOrShortcode)
  const cacheKey = `${userId || 'all'}:${shortcode || urlOrShortcode}`

  // Check cache
  const cached = duplicateCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result
  }

  // Fast direct query (avoids spawning heavy python processes in loop)
  let result = await runNodeDuplicateCheck(urlOrShortcode, userId, token)

  // If node query encountered an error or failed to connect, try python
  if (result.error) {
    try {
      result = await runPythonDuplicateCheck(urlOrShortcode, userId, token)
    } catch {
      // Return previous result
    }
  }

  // Store in cache for 5 minutes
  duplicateCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + 5 * 60 * 1000
  })

  return result
}
