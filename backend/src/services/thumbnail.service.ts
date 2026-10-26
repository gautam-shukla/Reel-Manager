import { execFile } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface ThumbnailResult {
  thumbnail: string
  username?: string
  caption?: string
}

export const PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1618005198143-e528346d9a59?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=600&auto=format&fit=crop'
]

export function getRandomPlaceholder(): string {
  const index = Math.floor(Math.random() * PLACEHOLDERS.length)
  return PLACEHOLDERS[index]
}

export function extractShortcode(url: string): string | null {
  const pattern = /\/(?:reels?|p|tv|share\/reel)\/([A-Za-z0-9_-]+)/
  const match = url.match(pattern)
  return match ? match[1] : null
}

export function getPythonExecutable(): string {
  if (process.env.PYTHON_PATH && existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH
  }

  const rootDir = path.resolve(__dirname, '../../..')
  const backendDir = path.resolve(__dirname, '../..')

  const candidates = [
    process.platform === 'win32'
      ? path.resolve(rootDir, '.venv/Scripts/python.exe')
      : path.resolve(rootDir, '.venv/bin/python'),
    process.platform === 'win32'
      ? path.resolve(backendDir, '.venv/Scripts/python.exe')
      : path.resolve(backendDir, '.venv/bin/python')
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return process.platform === 'win32' ? 'python' : 'python3'
}

export function getScriptPath(): string {
  return path.resolve(__dirname, '../../scripts/get_thumbnail.py')
}

export async function fetchThumbnail(url: string): Promise<ThumbnailResult> {
  const rawToken = process.env.NEXT_PUBLIC_INSTAGRAM_OEMBED_TOKEN || process.env.INSTAGRAM_OEMBED_TOKEN
  const userToken = rawToken?.includes('|') ? rawToken.split('|')[1] : rawToken

  // 1. Try to fetch using Instagram Basic Display API if we have a user token
  if (userToken && userToken.startsWith('IG')) {
    try {
      const shortcode = extractShortcode(url)
      if (shortcode) {
        console.log(`[Reel Manager] Querying Instagram Graph API for shortcode: ${shortcode}`)
        const graphUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,username,thumbnail_url,permalink&access_token=${userToken}`
        const graphRes = await fetch(graphUrl)
        if (graphRes.ok) {
          const graphData: any = await graphRes.json()
          const matchingMedia = graphData.data?.find((item: any) => {
            return item.permalink?.includes(shortcode) || item.id === shortcode
          })

          if (matchingMedia) {
            console.log('[Reel Manager] Found matching media in Graph API!')
            return {
              thumbnail: matchingMedia.thumbnail_url || matchingMedia.media_url,
              username: matchingMedia.username || 'instagram_user',
              caption: matchingMedia.caption || ''
            }
          } else {
            console.log('[Reel Manager] Media not found in User Media history.')
          }
        } else {
          console.error('[Reel Manager] Graph API returned status:', graphRes.status)
        }
      }
    } catch (graphErr) {
      console.error('[Reel Manager] Error querying Instagram Graph API:', graphErr)
    }
  }

  // 2. Try to fetch using Python instaloader script
  const scriptPath = getScriptPath()
  const pythonExecutable = getPythonExecutable()

  console.log(`[Reel Manager] Using Python executable: ${pythonExecutable}`)
  console.log(`[Reel Manager] Executing script: ${scriptPath} with URL: ${url}`)

  const pythonResult = await new Promise<{ thumbnail_url: string; username: string; caption?: string } | null>((resolve) => {
    execFile(
      pythonExecutable,
      [scriptPath, url],
      {
        timeout: 25000,
        env: { ...process.env }
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error('Error running python get_thumbnail script:', error)
          console.error('Script stdout:', stdout)
          console.error('Script stderr:', stderr)
          resolve(null)
          return
        }
        try {
          const startIdx = stdout.indexOf('{')
          const endIdx = stdout.lastIndexOf('}')
          if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
            throw new Error('No JSON object found in stdout')
          }
          const data = JSON.parse(stdout.slice(startIdx, endIdx + 1))
          if (data.thumbnail_url) {
            resolve(data)
            return
          }
        } catch (parseErr) {
          console.error('Failed to parse JSON from python script output:', parseErr, stdout)
        }
        resolve(null)
      }
    )
  })

  if (pythonResult) {
    return {
      thumbnail: pythonResult.thumbnail_url,
      username: pythonResult.username,
      caption: pythonResult.caption || ''
    }
  }

  // 3. Fallback to Instagram oEmbed if available
  const token = process.env.NEXT_PUBLIC_INSTAGRAM_OEMBED_TOKEN || process.env.INSTAGRAM_OEMBED_TOKEN
  if (token) {
    try {
      const oembedUrl = `https://graph.facebook.com/v17.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${token}`
      const oembedResponse = await fetch(oembedUrl)
      if (oembedResponse.ok) {
        const data: any = await oembedResponse.json()
        if (data.thumbnail_url) {
          return {
            thumbnail: data.thumbnail_url,
            username: data.author_name || 'instagram_user',
            caption: data.title || ''
          }
        }
      }
    } catch (oembedErr) {
      console.error('[Reel Manager] Error querying Instagram oEmbed:', oembedErr)
    }
  }

  // 4. Ultimate Fallback to random placeholder
  return {
    thumbnail: getRandomPlaceholder(),
    username: 'instagram_user',
    caption: ''
  }
}
