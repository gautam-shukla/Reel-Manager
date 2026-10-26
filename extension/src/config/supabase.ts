import { AuthSession, Folder, ReelPayload, SavedReel, UserProfile } from '../types/index.js'

export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://jyxukgnvceauicdiuyuo.supabase.co'
export const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_s1w00m2nAYGaZW9H5cXfnQ_2J1WO_pi'
export const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000'
export const WEBAPP_URL = (import.meta as any).env?.VITE_WEBAPP_URL || 'http://localhost:3000'

const commonHeaders = {
  apikey: SUPABASE_ANON_KEY,
  'Content-Type': 'application/json'
}

/**
 * Sign in using email and password via Supabase Auth REST API
 */
export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`
  const res = await fetch(url, {
    method: 'POST',
    headers: commonHeaders,
    body: JSON.stringify({ email, password })
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error_description || errorData.msg || 'Invalid email or password')
  }

  const data = await res.json()
  const user: UserProfile = {
    id: data.user.id,
    email: data.user.email,
    username: data.user.user_metadata?.username || data.user.email?.split('@')[0]
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user
  }
}

/**
 * Verify access token and get current user
 */
export async function getCurrentUser(token: string): Promise<UserProfile> {
  const url = `${SUPABASE_URL}/auth/v1/user`
  const res = await fetch(url, {
    headers: {
      ...commonHeaders,
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) {
    throw new Error('Session expired')
  }

  const data = await res.json()
  return {
    id: data.id,
    email: data.email,
    username: data.user_metadata?.username || data.email?.split('@')[0]
  }
}

/**
 * Fetch active folders for the user
 */
export async function fetchUserFolders(token: string, userId: string): Promise<Folder[]> {
  const foldersUrl = `${SUPABASE_URL}/rest/v1/folders?select=id,name,user_id,created_at,parent_id,is_deleted&user_id=eq.${userId}&is_deleted=eq.false&order=created_at.desc`
  const res = await fetch(foldersUrl, {
    headers: {
      ...commonHeaders,
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to fetch folders: ${err}`)
  }

  const folders: Folder[] = await res.json()

  // Get reel counts per folder
  try {
    const reelsUrl = `${SUPABASE_URL}/rest/v1/reels?select=folder_id&user_id=eq.${userId}&is_deleted=eq.false`
    const reelsRes = await fetch(reelsUrl, {
      headers: {
        ...commonHeaders,
        Authorization: `Bearer ${token}`
      }
    })
    if (reelsRes.ok) {
      const reels: { folder_id: string }[] = await reelsRes.json()
      const counts: Record<string, number> = {}
      for (const r of reels) {
        if (r.folder_id) {
          counts[r.folder_id] = (counts[r.folder_id] || 0) + 1
        }
      }
      for (const f of folders) {
        f.reels_count = counts[f.id] || 0
      }
    }
  } catch {
    // Non-fatal, counts will remain undefined
  }

  return folders
}

/**
 * Create a new folder
 */
export async function createUserFolder(token: string, userId: string, name: string): Promise<Folder> {
  const url = `${SUPABASE_URL}/rest/v1/folders`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...commonHeaders,
      Authorization: `Bearer ${token}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      user_id: userId,
      name: name.trim(),
      is_deleted: false
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create folder: ${err}`)
  }

  const data = await res.json()
  return data[0]
}

/**
 * Save a reel to the database
 */
export async function saveReelToDatabase(token: string, payload: ReelPayload): Promise<SavedReel> {
  const url = `${SUPABASE_URL}/rest/v1/reels`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...commonHeaders,
      Authorization: `Bearer ${token}`,
      Prefer: 'return=representation'
    },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({
      user_id: payload.user_id,
      folder_id: payload.folder_id,
      original_folder_id: payload.original_folder_id || payload.folder_id,
      instagram_url: payload.instagram_url,
      thumbnail_url: payload.thumbnail_url || null,
      note: payload.note || '',
      instagram_username: payload.instagram_username || null,
      instagram_caption: payload.instagram_caption || null,
      is_deleted: false
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to save reel: ${err}`)
  }

  const data = await res.json()
  return data[0]
}

/**
 * Fetch recently saved reels
 */
export async function fetchRecentUserReels(token: string, userId: string, limit = 5): Promise<SavedReel[]> {
  const url = `${SUPABASE_URL}/rest/v1/reels?select=id,instagram_url,thumbnail_url,note,instagram_username,instagram_caption,folder_id,created_at,folders!folder_id(name)&user_id=eq.${userId}&is_deleted=eq.false&order=created_at.desc&limit=${limit}`
  const res = await fetch(url, {
    headers: {
      ...commonHeaders,
      Authorization: `Bearer ${token}`
    },
    signal: AbortSignal.timeout(4000)
  })

  if (!res.ok) {
    return []
  }

  const data = await res.json()
  return (data || []).map((item: any) => ({
    id: item.id,
    instagram_url: item.instagram_url,
    thumbnail_url: item.thumbnail_url,
    note: item.note,
    instagram_username: item.instagram_username,
    instagram_caption: item.instagram_caption,
    folder_id: item.folder_id,
    folder_name: item.folders?.name || 'Folder',
    created_at: item.created_at
  }))
}

/**
 * Ask backend scraper or fallback for thumbnail and caption
 */
export async function fetchMetadataFromBackend(url: string): Promise<{ thumbnail?: string; username?: string; caption?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/thumbnail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({ url })
    })

    if (res.ok) {
      const data = await res.json()
      return {
        thumbnail: data.thumbnail,
        username: data.username,
        caption: data.caption
      }
    }
  } catch {
    // Backend may not be running locally; will use DOM-extracted metadata
  }

  return {}
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  folderName?: string
  folderId?: string
  existingReelId?: string
  shortcode?: string
}

/**
 * Check if a reel with the given shortcode or URL already exists in any of the user's folders.
 * Tries the local backend duplicate check endpoint (with memory cache) first with 2s timeout,
 * with direct Supabase REST query as fallback with 2.5s timeout.
 */
const RESERVED_SLUGS = new Set([
  'reel', 'reels', 'p', 'tv', 'share', 'explore', 'stories', 'videos', 'audio',
  'channel', 'direct', 'feed', 'accounts', 'developer', 'about', 'legal'
])

export function extractValidShortcode(urlOrCode: string): string | null {
  if (!urlOrCode) return null
  const clean = urlOrCode.trim()
  const match = clean.match(/\/(?:reels?|p|tv|share\/reel)\/([A-Za-z0-9_-]+)/)
  const candidate = match ? match[1] : clean.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '')
  if (candidate && candidate.length >= 5 && !RESERVED_SLUGS.has(candidate.toLowerCase()) && /^[A-Za-z0-9_-]+$/.test(candidate)) {
    return candidate
  }
  return null
}

export async function checkDuplicateReel(
  token: string,
  userId: string,
  shortcodeOrUrl: string
): Promise<DuplicateCheckResult> {
  const shortcode = extractValidShortcode(shortcodeOrUrl)
  if (!shortcode) {
    return { isDuplicate: false }
  }

  // 1. Try local backend duplicate service first (executes check_duplicate.py or Node cache)
  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/check-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      signal: AbortSignal.timeout(2000),
      body: JSON.stringify({ url: shortcodeOrUrl, shortcode, user_id: userId })
    })
    if (backendRes.ok) {
      const bData = await backendRes.json()
      if (bData && typeof bData.isDuplicate === 'boolean') {
        return {
          isDuplicate: bData.isDuplicate,
          folderName: bData.folderName || 'Folder',
          folderId: bData.folderId,
          existingReelId: bData.reelId,
          shortcode
        }
      }
    }
  } catch {
    // Backend offline or timed out; continue to direct Supabase REST query
  }

  // 2. Direct Supabase REST API query using unambiguous foreign key join folders!folder_id
  try {
    const url = `${SUPABASE_URL}/rest/v1/reels?select=id,folder_id,instagram_url,folders!folder_id(id,name,is_deleted)&user_id=eq.${userId}&is_deleted=eq.false&instagram_url=ilike.*${encodeURIComponent(shortcode)}*&limit=1`
    const res = await fetch(url, {
      headers: {
        ...commonHeaders,
        Authorization: `Bearer ${token}`
      },
      signal: AbortSignal.timeout(2500)
    })

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0]
        let folderName = item.folders?.name
        if (!folderName && Array.isArray(item.folders) && item.folders.length > 0) {
          folderName = item.folders[0]?.name
        }

        // Secondary fallback: lookup folder by ID if name wasn't joined
        if (!folderName && item.folder_id) {
          try {
            const fRes = await fetch(`${SUPABASE_URL}/rest/v1/folders?select=name&id=eq.${item.folder_id}&limit=1`, {
              headers: { ...commonHeaders, Authorization: `Bearer ${token}` },
              signal: AbortSignal.timeout(1500)
            })
            if (fRes.ok) {
              const fData = await fRes.json()
              if (Array.isArray(fData) && fData.length > 0) {
                folderName = fData[0]?.name
              }
            }
          } catch {
            // Ignore
          }
        }

        return {
          isDuplicate: true,
          folderName: folderName || 'Folder',
          folderId: item.folder_id,
          existingReelId: item.id,
          shortcode
        }
      }
    }
  } catch (err: any) {
    console.warn('[Reel Manager] Error checking duplicate reel directly with Supabase:', err.message || err)
  }

  return { isDuplicate: false, shortcode }
}

