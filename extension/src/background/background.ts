import {
  AuthSession,
  ExtensionMessage,
  Folder,
  SavedReel
} from '../types/index.js'
import {
  createUserFolder,
  fetchMetadataFromBackend,
  fetchRecentUserReels,
  fetchUserFolders,
  getCurrentUser,
  saveReelToDatabase,
  signInWithPassword,
  checkDuplicateReel,
  WEBAPP_URL
} from '../config/supabase.js'

// Cache session in memory and sync with chrome.storage.local
let cachedSession: AuthSession | null = null

// Load initial session on startup
chrome.storage.local.get(['session'], (result) => {
  if (result.session) {
    cachedSession = result.session
  }
})

// Broadcast message to all Instagram tabs
async function notifyInstagramTabs(message: any) {
  try {
    const tabs = await chrome.tabs.query({ url: '*://*.instagram.com/*' })
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {})
      }
    }
  } catch (err) {
    console.error('[Reel Manager Background] Error broadcasting to tabs:', err)
  }
}

// When extension action icon is clicked in toolbar
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id && tab.url && tab.url.includes('instagram.com')) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' }).catch(() => {})
  } else {
    // If not on Instagram, open Instagram Reels in new tab
    chrome.tabs.create({ url: 'https://www.instagram.com/reels/' })
  }
})

// Main message handler
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  handleMessage(message)
    .then((res) => sendResponse({ success: true, data: res }))
    .catch((err) => {
      console.error('[Reel Manager Background] Message error:', err)
      sendResponse({ success: false, error: err.message || 'Unknown error' })
    })

  // Return true to indicate asynchronous response
  return true
})

async function handleMessage(message: ExtensionMessage): Promise<any> {
  switch (message.type) {
    case 'SYNC_SESSION': {
      cachedSession = message.session
      await chrome.storage.local.set({ session: message.session })
      notifyInstagramTabs({ type: 'SESSION_UPDATED', session: message.session })
      return { synced: true }
    }

    case 'GET_SESSION': {
      if (!cachedSession) {
        const stored = await chrome.storage.local.get(['session'])
        cachedSession = stored.session || null
      }

      // Check if session has expired
      if (cachedSession) {
        const nowSec = Math.floor(Date.now() / 1000)
        if (cachedSession.expires_at && cachedSession.expires_at < nowSec) {
          // Verify with Supabase
          try {
            await getCurrentUser(cachedSession.access_token)
          } catch {
            cachedSession = null
            await chrome.storage.local.remove(['session'])
          }
        }
      }

      return cachedSession
    }

    case 'SIGN_IN': {
      const session = await signInWithPassword(message.email, message.password)
      cachedSession = session
      await chrome.storage.local.set({ session })
      notifyInstagramTabs({ type: 'SESSION_UPDATED', session })
      return session
    }

    case 'SIGN_OUT': {
      cachedSession = null
      await chrome.storage.local.remove(['session'])
      notifyInstagramTabs({ type: 'SESSION_UPDATED', session: null })
      return { signedOut: true }
    }

    case 'FETCH_FOLDERS': {
      if (!cachedSession) throw new Error('Not logged in')
      return await fetchUserFolders(cachedSession.access_token, cachedSession.user.id)
    }

    case 'CREATE_FOLDER': {
      if (!cachedSession) throw new Error('Not logged in')
      return await createUserFolder(cachedSession.access_token, cachedSession.user.id, message.name)
    }

    case 'SAVE_REEL': {
      if (!cachedSession) throw new Error('Not logged in')

      let thumbnail = message.payload.thumbnail_url
      let username = message.payload.instagram_username
      let caption = message.payload.instagram_caption

      // If thumbnail or username is missing, query backend scraper for fallback enrichment
      if (!thumbnail || !username) {
        try {
          const enriched = await fetchMetadataFromBackend(message.payload.instagram_url)
          if (!thumbnail && enriched.thumbnail && !enriched.thumbnail.includes('images.unsplash.com')) {
            thumbnail = enriched.thumbnail
          }
          if (!username && enriched.username) username = enriched.username
          if (!caption && enriched.caption) caption = enriched.caption
        } catch {
          // Non-critical, continue with what we captured
        }
      }

      // Verify that this reel does not already exist in any of the user's folders
      try {
        const duplicate = await checkDuplicateReel(
          cachedSession.access_token,
          cachedSession.user.id,
          message.payload.instagram_url
        )
        if (duplicate.isDuplicate) {
          return {
            isDuplicate: true,
            folderName: duplicate.folderName || 'Folder',
            folderId: duplicate.folderId
          }
        }
      } catch (err: any) {
        console.warn('[Reel Manager Background] Non-fatal duplicate check warning:', err)
      }

      const saved = await saveReelToDatabase(cachedSession.access_token, {
        ...message.payload,
        user_id: cachedSession.user.id,
        thumbnail_url: thumbnail,
        instagram_username: username,
        instagram_caption: caption
      })

      return saved
    }

    case 'CHECK_DUPLICATE': {
      if (!cachedSession) return { isDuplicate: false }
      return await checkDuplicateReel(
        cachedSession.access_token,
        cachedSession.user.id,
        message.url || message.shortcode || ''
      )
    }

    case 'FETCH_RECENT': {
      if (!cachedSession) throw new Error('Not logged in')
      return await fetchRecentUserReels(cachedSession.access_token, cachedSession.user.id, 5)
    }

    case 'FETCH_THUMBNAIL': {
      return await fetchMetadataFromBackend(message.url)
    }

    case 'OPEN_WEBAPP': {
      const targetUrl = message.path ? `${WEBAPP_URL}${message.path}` : WEBAPP_URL
      const tabs = await chrome.tabs.query({ url: `${WEBAPP_URL}/*` })
      if (tabs.length > 0 && tabs[0].id) {
        await chrome.tabs.update(tabs[0].id, { active: true, url: targetUrl })
      } else {
        await chrome.tabs.create({ url: targetUrl })
      }
      return { opened: true }
    }

    default:
      throw new Error(`Unsupported message type: ${(message as any).type}`)
  }
}
