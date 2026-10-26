import { DetectedReel } from '../types/index.js'
import { ReelManagerSidebar } from './sidebar.js'
import { ReelCaptureQueue, CapturedReelEntry } from './queue.js'

console.log('[Reel Manager] Instagram content script initialized.')

const sidebar = new ReelManagerSidebar()
const captureQueue = new ReelCaptureQueue()

// Keep reference to currently visible active video
let activeVideoEl: HTMLVideoElement | null = null

// Wire up frame capturer so sidebar "Snap Frame" button can grab the exact video frame
sidebar.setFrameCapturer(() => {
  return captureVideoFrame(activeVideoEl)
})

// Wire up sidebar open trigger so opening drawer immediately hydrates the visible reel
sidebar.setOnOpen(() => {
  updateActiveReel(true)
})

// Listen for background messages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TOGGLE_SIDEBAR') {
    sidebar.toggle()
    sendResponse({ toggled: true })
  } else if (message.type === 'SESSION_UPDATED') {
    sidebar.setSession(message.session)
    sendResponse({ updated: true })
  }
})

const RESERVED_SLUGS = new Set([
  'reel', 'reels', 'p', 'tv', 'share', 'explore', 'stories', 'videos', 'audio',
  'channel', 'direct', 'feed', 'accounts', 'developer', 'about', 'legal'
])

export function isValidShortcode(code?: string | null): code is string {
  if (!code) return false
  const clean = code.trim().toLowerCase()
  return clean.length >= 5 && !RESERVED_SLUGS.has(clean) && /^[a-zA-Z0-9_-]+$/.test(clean)
}

// Helper to extract shortcode from a URL
function extractShortcode(url?: string | null): string | null {
  if (!url) return null
  const pattern = /\/(?:reels?|p|tv|share\/reel)\/([A-Za-z0-9_-]+)/
  const match = url.match(pattern)
  const candidate = match ? match[1] : url.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '')
  if (isValidShortcode(candidate)) {
    return candidate
  }
  return null
}

/**
 * Capture current frame from a live <video> element using HTML5 Canvas.
 * Generates a clean 360x640 portrait JPEG data URL suitable for immediate saving and cover display.
 */
function captureVideoFrame(video?: HTMLVideoElement | null): string | null {
  if (!video) return null
  try {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      const canvas = document.createElement('canvas')
      const targetWidth = 360
      const targetHeight = Math.round((video.videoHeight / video.videoWidth) * targetWidth) || 640
      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
      return canvas.toDataURL('image/jpeg', 0.82)
    }
  } catch (err) {
    // Canvas might be tainted if cross-origin restrictions apply
  }
  return null
}

/**
 * Search the DOM for reel cover image fallback if video frame is not yet painted
 */
function findCoverFromDOM(container?: HTMLElement | null, videoEl?: HTMLVideoElement | null): string | null {
  const doc = container || document

  // 1. Try video poster attribute
  if (videoEl?.poster && videoEl.poster.startsWith('http')) {
    return videoEl.poster
  }

  // 2. Try page OpenGraph meta tag (available on /reel/xyz/ and /p/xyz/)
  const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
  if (ogImg && ogImg.startsWith('http')) {
    return ogImg
  }

  // 3. Try link rel="image_src"
  const linkImg = document.querySelector('link[rel="image_src"]')?.getAttribute('href')
  if (linkImg && linkImg.startsWith('http')) {
    return linkImg
  }

  // 4. Try live video frame snapshot
  const frameSnap = captureVideoFrame(videoEl)
  if (frameSnap) {
    return frameSnap
  }

  // 5. Look for matching <img> tags within the reel container (filter out avatars)
  const candidateImgs = Array.from(doc.querySelectorAll<HTMLImageElement>('img'))
  for (const img of candidateImgs) {
    const src = img.src || img.getAttribute('src') || ''
    if (!src || src.includes('profile') || src.includes('data:image/svg')) continue
    const rect = img.getBoundingClientRect()
    // Reel cover images have considerable height
    if (rect.height > 140 && rect.width > 70) {
      return src
    }
  }

  // 6. Look for background-image styles
  const bgDivs = Array.from(doc.querySelectorAll<HTMLElement>('div[style*="background-image"]'))
  for (const d of bgDivs) {
    const bg = d.style.backgroundImage
    const match = bg.match(/url\(["']?(https?:\/\/[^"']+)["']?\)/)
    if (match && !match[1].includes('profile')) {
      return match[1]
    }
  }

  return null
}

/**
 * Extract creator's username directly from the HTML part of the website.
 * Inspects:
 * 1. Profile avatar <img alt="username's profile picture"> in HTML
 * 2. Anchor directly to the left of "Follow" / "Following" button or in same author row (Image 2)
 * 3. Author links inside header / article / dialog (e.g. <a href="/username/">)
 * 4. Schema.org structured data (<script type="application/ld+json">)
 * 5. OpenGraph and meta tags (<meta property="og:title">, <meta property="og:description">, <meta name="author">, <meta property="al:ios:url">)
 * 6. Document title (<title>username on Instagram: ...</title>)
 * 7. Embedded hydration JSON in HTML <script> tags matching the shortcode
 */
function extractCreatorUsername(container?: HTMLElement | null, videoEl?: HTMLVideoElement | null, shortcode?: string | null): string | null {
  const doc = container || (videoEl ? (videoEl.closest('article, div[role="dialog"]') as HTMLElement) : null) || document

  const reservedPaths = new Set([
    'explore', 'reels', 'reel', 'p', 'tv', 'stories', 'direct', 'accounts',
    'about', 'legal', 'help', 'privacy', 'terms', 'directory', 'audio', 'music',
    'instagram', 'create', 'search', 'notifications', 'profile', 'settings',
    'followers', 'following', 'tagged', 'channel', 'saved', 'home', 'login', 'emails',
    'developer', 'meta', 'creator'
  ])

  function sanitizeUsername(raw?: string | null): string | null {
    if (!raw) return null
    const clean = raw.trim().replace(/^@/, '').replace(/\s+/g, '')
    if (clean.length < 2 || clean.length > 30) return null
    if (reservedPaths.has(clean.toLowerCase())) return null
    if (/^[A-Za-z0-9._]+$/.test(clean)) {
      return clean
    }
    return null
  }

  // 1. Avatar profile picture <img> alt in the HTML (e.g. "kamoshi_writes_26's profile picture")
  const avatarImgs = Array.from(doc.querySelectorAll<HTMLImageElement>(
    'img[alt*="profile picture" i], img[alt*="profile photo" i], header img, article header img'
  ))
  for (const img of avatarImgs) {
    const alt = (img.getAttribute('alt') || '').trim()
    const m1 = alt.match(/^([A-Za-z0-9._]+)(?:'s|’s)?\s+profile\s+(?:picture|photo)/i)
    if (m1) {
      const u = sanitizeUsername(m1[1])
      if (u) return u
    }
    const m2 = alt.match(/profile\s+(?:picture|photo)\s+of\s+([A-Za-z0-9._]+)/i)
    if (m2) {
      const u = sanitizeUsername(m2[1])
      if (u) return u
    }
    const parentA = img.closest('a')
    if (parentA) {
      const href = parentA.getAttribute('href') || ''
      const mHref = href.match(/^\/([A-Za-z0-9._]+)\/?$/)
      if (mHref) {
        const u = sanitizeUsername(mHref[1])
        if (u) return u
      }
    }
  }

  // 2. Element directly to the left of "Follow" / "Following" button or in same author row (Image 2)
  const candidateButtons = Array.from(doc.querySelectorAll<HTMLElement>('button, div[role="button"], span'))
  for (const btn of candidateButtons) {
    const text = btn.textContent?.trim().toLowerCase()
    if (text === 'follow' || text === 'following') {
      let sibling = btn.previousElementSibling
      while (sibling) {
        const anchor = sibling.matches('a') ? (sibling as HTMLAnchorElement) : sibling.querySelector<HTMLAnchorElement>('a')
        if (anchor) {
          const u = sanitizeUsername(anchor.textContent)
          if (u) return u
          const hrefMatch = (anchor.getAttribute('href') || '').match(/^\/([A-Za-z0-9._]+)\/?$/)
          if (hrefMatch && sanitizeUsername(hrefMatch[1])) return hrefMatch[1]
        }
        const textCandidate = sanitizeUsername(sibling.textContent)
        if (textCandidate) return textCandidate
        sibling = sibling.previousElementSibling
      }

      const headerRow = btn.closest('header, div[style*="flex"], div[class*="header"], div')
      if (headerRow) {
        const anchors = Array.from(headerRow.querySelectorAll<HTMLAnchorElement>('a'))
        for (const a of anchors) {
          const href = a.getAttribute('href') || ''
          const hrefMatch = href.match(/^\/([A-Za-z0-9._]+)\/?$/)
          if (hrefMatch && sanitizeUsername(hrefMatch[1])) {
            return hrefMatch[1]
          }
          const u = sanitizeUsername(a.textContent)
          if (u && !href.includes('/explore/') && !href.includes('/reels/') && !href.includes('/p/')) {
            return u
          }
        }
      }
    }
  }

  // 3. Anchors inside header or author section of reel container
  const headerAnchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>(
    'header a, article header a, div[role="dialog"] header a, h2 a, h3 a, a[role="link"]'
  ))
  for (const a of headerAnchors) {
    const href = a.getAttribute('href') || ''
    const match = href.match(/^\/([A-Za-z0-9._]+)\/?$/)
    if (match && sanitizeUsername(match[1])) {
      return match[1]
    }
    const text = sanitizeUsername(a.textContent)
    if (text && !href.includes('/explore/') && !href.includes('/reels/') && !href.includes('/p/')) {
      return text
    }
  }

  // 4. Schema.org structured data in HTML <script type="application/ld+json">
  const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
  for (const s of ldScripts) {
    try {
      const parsed = JSON.parse(s.textContent || '{}')
      if (parsed.author?.alternateName) {
        const u = sanitizeUsername(parsed.author.alternateName)
        if (u) return u
      }
      if (parsed.author?.name) {
        const u = sanitizeUsername(parsed.author.name)
        if (u) return u
      }
      if (parsed.creator?.alternateName) {
        const u = sanitizeUsername(parsed.creator.alternateName)
        if (u) return u
      }
    } catch {}
  }

  // 5. OpenGraph meta tags in HTML <head>
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
  if (ogTitle) {
    const match = ogTitle.match(/^([A-Za-z0-9._]+)\s+on\s+Instagram/i)
    if (match && sanitizeUsername(match[1])) return match[1]
  }

  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content')
  if (ogDesc) {
    const match = ogDesc.match(/-\s*([A-Za-z0-9._]+)\s+on\s+[A-Za-z]+\s+\d+/i)
    if (match && sanitizeUsername(match[1])) return match[1]
  }

  const metaAuthor = document.querySelector('meta[name="author"]')?.getAttribute('content')
  if (metaAuthor) {
    const u = sanitizeUsername(metaAuthor)
    if (u) return u
  }

  const alIos = document.querySelector('meta[property="al:ios:url"]')?.getAttribute('content')
  if (alIos) {
    const match = alIos.match(/username=([A-Za-z0-9._]+)/i)
    if (match && sanitizeUsername(match[1])) return match[1]
  }

  // 6. Document title in HTML ("username on Instagram: ...")
  const docTitle = document.title || ''
  const mTitle1 = docTitle.match(/^([A-Za-z0-9._]+)\s+on\s+Instagram/i)
  if (mTitle1) {
    const u = sanitizeUsername(mTitle1[1])
    if (u) return u
  }
  const mTitle2 = docTitle.match(/by\s+([A-Za-z0-9._]+)\s+on\s+Instagram/i)
  if (mTitle2) {
    const u = sanitizeUsername(mTitle2[1])
    if (u) return u
  }

  // 7. Embedded JSON state in HTML <script> tags
  const scripts = Array.from(document.querySelectorAll('script:not([src])'))
  for (const s of scripts) {
    const content = s.textContent || ''
    if (shortcode && content.includes(shortcode) && content.includes('"username":')) {
      const match = content.match(/"username"\s*:\s*"([A-Za-z0-9._]+)"/)
      if (match && sanitizeUsername(match[1])) {
        return match[1]
      }
    }
  }

  return null
}

// Walk up ancestors from a video element to find the reel card container
function findReelContainer(video: HTMLVideoElement): HTMLElement {
  const standard = video.closest('article, div[role="dialog"], section, main > div') as HTMLElement
  if (standard) return standard

  let cur: HTMLElement | null = video.parentElement
  let best: HTMLElement = video.parentElement || (video as unknown as HTMLElement)
  let depth = 0
  while (cur && cur !== document.body && depth < 12) {
    const hasLink = cur.querySelector('a[href*="/reel/"], a[href*="/reels/"], a[href*="/p/"], a[href*="/share/reel/"]')
    if (hasLink) {
      return cur
    }
    best = cur
    cur = cur.parentElement
    depth++
  }
  return best
}

// Extract reel metadata from the current page or a given container
function inspectReelFromElement(container?: HTMLElement | null, videoEl?: HTMLVideoElement | null): DetectedReel | null {
  const doc = container || document

  // 1. Check current window URL first
  let shortcode = extractShortcode(window.location.href)

  // 2. Search inside container for reel links
  if (!shortcode && container) {
    const anchors = Array.from(container.querySelectorAll<HTMLAnchorElement>(
      'a[href*="/reel/"], a[href*="/reels/"], a[href*="/p/"], a[href*="/share/reel/"], a[href*="/tv/"]'
    ))
    for (const a of anchors) {
      const code = extractShortcode(a.href)
      if (code) {
        shortcode = code
        break
      }
    }
  }

  // 3. Walk ancestors of videoEl to find reel links
  if (!shortcode && videoEl) {
    let cur: HTMLElement | null = videoEl.parentElement
    let depth = 0
    while (cur && cur !== document.body && depth < 12) {
      const anchors = Array.from(cur.querySelectorAll<HTMLAnchorElement>(
        'a[href*="/reel/"], a[href*="/reels/"], a[href*="/p/"], a[href*="/share/reel/"]'
      ))
      for (const a of anchors) {
        const code = extractShortcode(a.href)
        if (code) {
          shortcode = code
          if (!container) container = cur
          break
        }
      }
      if (shortcode) break
      cur = cur.parentElement
      depth++
    }
  }

  // 4. Global page fallback: Find reel link closest to the active video in viewport
  if (!shortcode) {
    const allReelAnchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(
      'a[href*="/reel/"], a[href*="/reels/"], a[href*="/p/"], a[href*="/share/reel/"]'
    ))
    if (allReelAnchors.length > 0) {
      const targetY = videoEl ? (videoEl.getBoundingClientRect().top + videoEl.getBoundingClientRect().height / 2) : (window.innerHeight / 2)
      let minDistance = Infinity
      let bestCode: string | null = null

      for (const a of allReelAnchors) {
        const code = extractShortcode(a.href)
        if (code) {
          const rect = a.getBoundingClientRect()
          const aCenter = rect.top + rect.height / 2
          const dist = Math.abs(targetY - aCenter)
          if (dist < minDistance) {
            minDistance = dist
            bestCode = code
          }
        }
      }
      if (bestCode) {
        shortcode = bestCode
      }
    }
  }

  if (!shortcode) {
    return null
  }

  const reelUrl = `https://www.instagram.com/reel/${shortcode}/`

  // 5. Capture thumbnail (canvas frame snapshot or DOM cover)
  const targetVideo = videoEl || doc.querySelector<HTMLVideoElement>('video')
  const thumbnailUrl = captureVideoFrame(targetVideo) || findCoverFromDOM(container, targetVideo)

  // 6. Find creator username directly from HTML
  const username = extractCreatorUsername(container, targetVideo, shortcode)

  // 7. Find caption
  let caption: string | null = null
  const captionEl = doc.querySelector<HTMLElement>('h1, span[dir="auto"], div[dir="auto"], article ul li')
  if (captionEl) {
    const text = captionEl.textContent?.trim()
    if (text && text.length > 2) {
      caption = text
    }
  }

  return {
    url: reelUrl,
    shortcode,
    thumbnailUrl,
    username,
    caption,
    timestamp: Date.now()
  }
}

// Track active playing / visible video in viewport
let currentActiveReel: DetectedReel | null = null

function updateActiveReel(force = false) {
  const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('video'))
  let bestContainer: HTMLElement | null = null
  let bestVideo: HTMLVideoElement | null = null

  if (videos.length > 0) {
    const centerY = window.innerHeight / 2
    let minDistance = Infinity

    for (const v of videos) {
      const rect = v.getBoundingClientRect()
      if (rect.height > 0 && rect.width > 0) {
        const vCenter = rect.top + rect.height / 2
        const distance = Math.abs(centerY - vCenter)
        if (distance < minDistance) {
          minDistance = distance
          bestVideo = v
          bestContainer = findReelContainer(v)
        }
      }
    }
  }

  activeVideoEl = bestVideo

  const detected = inspectReelFromElement(bestContainer, bestVideo)
  if (detected && (force || detected.shortcode !== currentActiveReel?.shortcode)) {
    currentActiveReel = detected

    // Push into FIFO Capture Queue (keeps up to 4 captures in background; drops oldest on 5th)
    const entry: CapturedReelEntry = {
      shortcode: detected.shortcode,
      url: detected.url,
      thumbnailUrl: detected.thumbnailUrl || '',
      username: detected.username || 'creator',
      caption: detected.caption || '',
      capturedAt: Date.now()
    }
    const saved = captureQueue.add(entry)
    sidebar.setQueue(captureQueue.getAll(), saved)

    // If frame capture was not ready yet (e.g. video buffering), listen to video frame rendering
    if (bestVideo && (!saved.thumbnailUrl || !saved.thumbnailUrl.startsWith('data:'))) {
      const tryLiveFrameCapture = () => {
        const frame = captureVideoFrame(bestVideo)
        if (frame) {
          saved.thumbnailUrl = frame
          detected.thumbnailUrl = frame
          captureQueue.add(saved)
          sidebar.setQueue(captureQueue.getAll(), saved)
        }
      }
      bestVideo.addEventListener('playing', tryLiveFrameCapture, { once: true })
      bestVideo.addEventListener('loadeddata', tryLiveFrameCapture, { once: true })
      bestVideo.addEventListener('timeupdate', tryLiveFrameCapture, { once: true })
      setTimeout(tryLiveFrameCapture, 350)
      setTimeout(tryLiveFrameCapture, 900)
    }

    // If username is still pending hydration, retry HTML extraction and backend scraper fallback
    if (!saved.username || saved.username === 'creator') {
      const retryHtmlExtraction = () => {
        const u = extractCreatorUsername(bestContainer, bestVideo, detected.shortcode)
        if (u && (!saved.username || saved.username === 'creator')) {
          saved.username = u
          detected.username = u
          if (currentActiveReel && currentActiveReel.shortcode === detected.shortcode) {
            currentActiveReel.username = u
          }
          captureQueue.add(saved)
          sidebar.setQueue(captureQueue.getAll(), saved)
        }
      }
      setTimeout(retryHtmlExtraction, 250)
      setTimeout(retryHtmlExtraction, 700)

      chrome.runtime.sendMessage({ type: 'FETCH_THUMBNAIL', url: detected.url }, (res) => {
        if (res?.success && res.data) {
          if (res.data.username && (!saved.username || saved.username === 'creator')) {
            saved.username = res.data.username
            detected.username = res.data.username
            if (currentActiveReel && currentActiveReel.shortcode === detected.shortcode) {
              currentActiveReel.username = res.data.username
            }
          }
          if (res.data.caption && !saved.caption) {
            saved.caption = res.data.caption
            detected.caption = res.data.caption
            if (currentActiveReel && currentActiveReel.shortcode === detected.shortcode) {
              currentActiveReel.caption = res.data.caption
            }
          }
          captureQueue.add(saved)
          sidebar.setQueue(captureQueue.getAll(), saved)
        }
      })
    }
  }
}

/**
 * Remove grey boxes (Image 3 fix) and prevent any unstyled elements from rendering.
 */
function cleanupGreyBoxes() {
  document.querySelectorAll('.rm-infeed-btn').forEach((btn) => btn.remove())
  if (!document.getElementById('rm-global-fix')) {
    const style = document.createElement('style')
    style.id = 'rm-global-fix'
    style.textContent = `
      .rm-infeed-btn { display: none !important; visibility: hidden !important; width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important; border: 0 !important; }
    `
    document.head?.appendChild(style)
  }
}

// Observe URL changes (Instagram SPA routing)
let lastUrl = window.location.href
const checkUrlChange = () => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href
    updateActiveReel(true)
  }
}

window.addEventListener('popstate', checkUrlChange)
const originalPushState = history.pushState
history.pushState = function (...args) {
  const ret = originalPushState.apply(this, args)
  checkUrlChange()
  return ret
}

const originalReplaceState = history.replaceState
history.replaceState = function (...args) {
  const ret = originalReplaceState.apply(this, args)
  checkUrlChange()
  return ret
}

// Video play listener on document to automatically catch active video
document.addEventListener('playing', (e) => {
  if (e.target instanceof HTMLVideoElement) {
    updateActiveReel(false)
  }
}, true)

// Periodic DOM sweep, grey-box cleanup, URL observer & active reel detection
setInterval(() => {
  checkUrlChange()
  cleanupGreyBoxes()
  updateActiveReel(false)
}, 800)

window.addEventListener('scroll', () => {
  updateActiveReel(false)
  cleanupGreyBoxes()
}, { passive: true })

// Initial detection & cleanup
setTimeout(() => {
  cleanupGreyBoxes()
  updateActiveReel(true)
}, 800)
