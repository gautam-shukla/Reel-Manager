/**
 * Content script running on Reel Manager Web App (localhost:3000 / 127.0.0.1:3000)
 * Automatically syncs the user's logged-in session with the Reel Manager Chrome Extension.
 */

function findSupabaseSession(): any | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('sb-') && key.endsWith('-auth-token'))) {
        const item = localStorage.getItem(key)
        if (item) {
          const parsed = JSON.parse(item)
          if (parsed && parsed.access_token && parsed.user) {
            return parsed
          }
        }
      }
    }

    // Fallback checks
    const fallbackKeys = ['supabase.auth.token', 'sb_token', 'reel_manager_session']
    for (const key of fallbackKeys) {
      const item = localStorage.getItem(key)
      if (item) {
        try {
          const parsed = JSON.parse(item)
          if (parsed?.access_token) return parsed
        } catch {
          // Ignore
        }
      }
    }
  } catch (err) {
    console.error('[Reel Manager Bridge] Error reading localStorage:', err)
  }

  return null
}

function syncSessionToExtension() {
  const session = findSupabaseSession()
  if (session && session.access_token && session.user) {
    const formatted = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: {
        id: session.user.id,
        email: session.user.email,
        username: session.user.user_metadata?.username || session.user.email?.split('@')[0]
      }
    }

    chrome.runtime.sendMessage({ type: 'SYNC_SESSION', session: formatted }, (response) => {
      if (chrome.runtime.lastError) {
        // Extension background may not be awake yet
        return
      }
      if (response?.success) {
        console.log('[Reel Manager Extension] Successfully synced session from web app:', formatted.user.email)
      }
    })
  }
}

// Initial sync on page load
syncSessionToExtension()

// Listen for storage changes (user logs in or out in another tab)
window.addEventListener('storage', (e) => {
  if (e.key && e.key.includes('auth-token')) {
    syncSessionToExtension()
  }
})

// Periodic check in case auth state changes without storage event
setInterval(syncSessionToExtension, 4000)
