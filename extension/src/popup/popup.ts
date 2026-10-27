import { AuthSession } from '../types/index.js'

const userEmailEl = document.getElementById('user-email') as HTMLElement
const statusDotEl = document.getElementById('status-dot') as HTMLElement
const signoutBtn = document.getElementById('signout-btn') as HTMLButtonElement
const loggedInView = document.getElementById('logged-in-view') as HTMLElement
const loggedOutView = document.getElementById('logged-out-view') as HTMLElement
const folderCountEl = document.getElementById('folder-count') as HTMLElement
const recentCountEl = document.getElementById('recent-count') as HTMLElement
const openInstagramBtn = document.getElementById('open-instagram-btn') as HTMLButtonElement
const openWebappBtn = document.getElementById('open-webapp-btn') as HTMLButtonElement
const syncWebappLink = document.getElementById('sync-webapp-link') as HTMLAnchorElement
const loginForm = document.getElementById('popup-login-form') as HTMLFormElement
const loginEmailInput = document.getElementById('login-email') as HTMLInputElement
const loginPassInput = document.getElementById('login-password') as HTMLInputElement
const loginErrorEl = document.getElementById('login-error') as HTMLElement
const loginSubmitBtn = document.getElementById('login-submit-btn') as HTMLButtonElement

function updateUI(session: AuthSession | null) {
  if (session?.user) {
    userEmailEl.textContent = session.user.email
    statusDotEl.classList.add('active')
    signoutBtn.style.display = 'block'
    loggedInView.style.display = 'block'
    loggedOutView.style.display = 'none'

    // Fetch counts
    chrome.runtime.sendMessage({ type: 'FETCH_FOLDERS' }, (res) => {
      if (res?.success && Array.isArray(res.data)) {
        folderCountEl.textContent = String(res.data.length)
      }
    })

    chrome.runtime.sendMessage({ type: 'FETCH_RECENT' }, (res) => {
      if (res?.success && Array.isArray(res.data)) {
        recentCountEl.textContent = String(res.data.length)
      }
    })
  } else {
    userEmailEl.textContent = 'Not signed in'
    statusDotEl.classList.remove('active')
    signoutBtn.style.display = 'none'
    loggedInView.style.display = 'none'
    loggedOutView.style.display = 'block'
  }
}

// Check session on popup open
chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (res) => {
  if (res?.success) {
    updateUI(res.data)
  } else {
    updateUI(null)
  }
})

// Sign out
signoutBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'SIGN_OUT' }, () => {
    updateUI(null)
  })
})

// Open Instagram Reels
openInstagramBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.instagram.com/reels/' })
  window.close()
})

// Open Reel Manager
openWebappBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_WEBAPP' })
  window.close()
})

syncWebappLink.addEventListener('click', (e) => {
  e.preventDefault()
  chrome.runtime.sendMessage({ type: 'OPEN_WEBAPP' })
  window.close()
})

// Login Form Submit
loginForm.addEventListener('submit', (e) => {
  e.preventDefault()
  const email = loginEmailInput.value.trim()
  const password = loginPassInput.value

  if (!email || !password) return

  loginSubmitBtn.disabled = true
  loginSubmitBtn.textContent = 'Signing in...'
  loginErrorEl.style.display = 'none'

  chrome.runtime.sendMessage({ type: 'SIGN_IN', email, password }, (res) => {
    loginSubmitBtn.disabled = false
    loginSubmitBtn.textContent = 'Sign In'

    if (res?.success && res.data) {
      updateUI(res.data)
    } else {
      loginErrorEl.textContent = res?.error || 'Sign in failed'
      loginErrorEl.style.display = 'block'
    }
  })
})

// Server Configuration Elements
const serverUrlText = document.getElementById('server-url-text') as HTMLElement
const serverStatusPill = document.getElementById('server-status-pill') as HTMLElement
const serverConfigBtn = document.getElementById('server-config-btn') as HTMLButtonElement
const serverConfigModal = document.getElementById('server-config-modal') as HTMLElement
const closeServerModal = document.getElementById('close-server-modal') as HTMLButtonElement
const customServerUrlInput = document.getElementById('custom-server-url') as HTMLInputElement
const saveServerUrlBtn = document.getElementById('save-server-url-btn') as HTMLButtonElement
const presetBtns = document.querySelectorAll<HTMLButtonElement>('.preset-btn')

function formatHostDisplay(fullUrl: string): string {
  try {
    const u = new URL(fullUrl)
    return u.host || fullUrl
  } catch {
    return fullUrl.replace(/^https?:\/\//, '')
  }
}

function updateServerDisplay(url: string) {
  if (serverUrlText) {
    serverUrlText.textContent = formatHostDisplay(url)
  }
  if (customServerUrlInput) {
    customServerUrlInput.value = url
  }
}

// Fetch current config on open
chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, (res) => {
  if (res?.success && res.data?.webappUrl) {
    updateServerDisplay(res.data.webappUrl)
  }
})

// Modal Open/Close
serverStatusPill?.addEventListener('click', () => {
  if (serverConfigModal) serverConfigModal.style.display = 'flex'
})
serverConfigBtn?.addEventListener('click', () => {
  if (serverConfigModal) serverConfigModal.style.display = 'flex'
})
closeServerModal?.addEventListener('click', () => {
  if (serverConfigModal) serverConfigModal.style.display = 'none'
})

// Quick presets
presetBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetUrl = btn.dataset.url
    if (targetUrl) {
      chrome.runtime.sendMessage({ type: 'SET_WEBAPP_URL', url: targetUrl }, (res) => {
        if (res?.success) {
          updateServerDisplay(targetUrl)
          if (serverConfigModal) serverConfigModal.style.display = 'none'
        }
      })
    }
  })
})

// Custom URL Save
saveServerUrlBtn?.addEventListener('click', () => {
  const custom = customServerUrlInput?.value.trim()
  if (custom) {
    chrome.runtime.sendMessage({ type: 'SET_WEBAPP_URL', url: custom }, (res) => {
      if (res?.success) {
        updateServerDisplay(custom)
        if (serverConfigModal) serverConfigModal.style.display = 'none'
      }
    })
  }
})
