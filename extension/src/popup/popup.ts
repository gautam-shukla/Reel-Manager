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
