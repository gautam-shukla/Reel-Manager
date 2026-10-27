import { AuthSession, DetectedReel, Folder, SavedReel, UserProfile } from '../types/index.js'
import { CapturedReelEntry } from './queue.js'
// @ts-ignore - CSS string imported
import sidebarCss from './sidebar.css?raw'

export class ReelManagerSidebar {
  private host: HTMLElement
  private shadow: ShadowRoot
  private isOpen = false
  private user: UserProfile | null = null
  private folders: Folder[] = []
  private selectedFolderId: string = ''
  private currentReel: DetectedReel | null = null
  private queue: CapturedReelEntry[] = []
  private recentReels: SavedReel[] = []
  private isSubmitting = false
  private successMessage: string | null = null
  private errorMessage: string | null = null
  private noteText: string = ''
  private frameCapturer: (() => string | null) | null = null
  private onOpen?: () => void
  private tabPosition: { left: number; top: number } | null = null
  private duplicateFolder: string | null = null
  private duplicateCache = new Map<string, string | null>()
  private checkingShortcode: string | null = null

  constructor() {
    this.host = document.createElement('div')
    this.host.id = 'reel-manager-root'
    this.shadow = this.host.attachShadow({ mode: 'open' })
    document.body.appendChild(this.host)

    try {
      const saved = localStorage.getItem('rm_tab_pos')
      if (saved) {
        const pos = JSON.parse(saved)
        if (typeof pos?.left === 'number' && typeof pos?.top === 'number') {
          this.tabPosition = {
            left: Math.max(8, Math.min(window.innerWidth - 130, pos.left)),
            top: Math.max(8, Math.min(window.innerHeight - 50, pos.top))
          }
        }
      }
    } catch {}

    this.render()
    this.initSession()
    this.bindGlobalShortcuts()
  }

  public setFrameCapturer(fn: () => string | null) {
    this.frameCapturer = fn
  }

  public setOnOpen(fn: () => void) {
    this.onOpen = fn
  }

  private async initSession() {
    try {
      chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (res) => {
        if (res?.success && res.data) {
          this.setSession(res.data)
        } else {
          this.render()
        }
      })
    } catch {
      this.render()
    }
  }

  public setSession(session: AuthSession | null) {
    if (session?.user) {
      this.user = session.user
      this.fetchFolders()
      this.fetchRecent()
    } else {
      this.user = null
      this.folders = []
      this.recentReels = []
      this.duplicateCache.clear()
    }
    this.render()
  }

  private async fetchFolders() {
    chrome.runtime.sendMessage({ type: 'FETCH_FOLDERS' }, (res) => {
      if (res?.success && Array.isArray(res.data)) {
        this.folders = res.data
        if (this.folders.length > 0) {
          chrome.storage.local.get(['lastFolderId'], (data) => {
            if (data.lastFolderId && this.folders.some((f) => f.id === data.lastFolderId)) {
              this.selectedFolderId = data.lastFolderId
            } else {
              this.selectedFolderId = this.folders[0].id
            }
            this.render()
          })
        } else {
          this.selectedFolderId = ''
          this.render()
        }
      }
    })
  }

  private async fetchRecent() {
    chrome.runtime.sendMessage({ type: 'FETCH_RECENT' }, (res) => {
      if (res?.success && Array.isArray(res.data)) {
        this.recentReels = res.data
        this.render()
      }
    })
  }

  public setQueue(queue: CapturedReelEntry[], active?: CapturedReelEntry) {
    this.queue = queue
    const prevShortcode = this.currentReel?.shortcode
    if (active) {
      this.currentReel = {
        url: active.url,
        shortcode: active.shortcode,
        thumbnailUrl: active.thumbnailUrl,
        username: active.username,
        caption: active.caption,
        timestamp: active.capturedAt
      }
    } else if (!this.currentReel && queue.length > 0) {
      const latest = queue[queue.length - 1]
      this.currentReel = {
        url: latest.url,
        shortcode: latest.shortcode,
        thumbnailUrl: latest.thumbnailUrl,
        username: latest.username,
        caption: latest.caption,
        timestamp: latest.capturedAt
      }
    }
    // If the active reel changed, reset duplicate/status state so UI is fresh and normal
    if (this.currentReel && this.currentReel.shortcode !== prevShortcode) {
      this.duplicateFolder = null
      this.errorMessage = null
      this.successMessage = null
    }
    this.render()
  }

  public setCurrentReel(reel: DetectedReel | null) {
    this.currentReel = reel
    this.successMessage = null
    this.errorMessage = null
    // Reset duplicate warning banner so reel appears fresh upon navigation
    this.duplicateFolder = null
    this.render()
  }

  public openWithReel(reel: DetectedReel) {
    this.setCurrentReel(reel)
    this.open()
  }

  public toggle() {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  public open() {
    this.isOpen = true
    this.successMessage = null
    this.errorMessage = null
    this.duplicateFolder = null
    if (this.onOpen) {
      try {
        this.onOpen()
      } catch {}
    }
    if (this.user) {
      this.fetchFolders()
      this.fetchRecent()
    }
    this.render()
    this.updateDrawerState()
  }

  public close() {
    this.isOpen = false
    this.updateDrawerState()
  }

  private updateDrawerState() {
    const tab = this.shadow.querySelector<HTMLElement>('#rm-tab')
    const drawer = this.shadow.querySelector<HTMLElement>('.rm-drawer')
    const backdrop = this.shadow.querySelector<HTMLElement>('#rm-backdrop')

    if (!drawer || !backdrop || !tab) return

    const tabRect = tab.getBoundingClientRect()
    const drawerWidth = 390
    const margin = 16

    // Determine horizontal placement based on tab position
    let drawerLeft: number
    const tabCenterX = tabRect.left + tabRect.width / 2
    const isOnRightHalf = tabCenterX > window.innerWidth / 2

    if (isOnRightHalf) {
      // Place drawer on the right side
      const rightDistance = Math.max(margin, Math.min(window.innerWidth - tabRect.right, window.innerWidth - drawerWidth - margin))
      drawer.style.right = `${rightDistance}px`
      drawer.style.left = 'auto'
      drawerLeft = window.innerWidth - rightDistance - drawerWidth
    } else {
      // Place drawer on the left side
      const leftDistance = Math.max(margin, Math.min(tabRect.left, window.innerWidth - drawerWidth - margin))
      drawer.style.left = `${leftDistance}px`
      drawer.style.right = 'auto'
      drawerLeft = leftDistance
    }

    // Determine vertical placement
    let drawerTop = tabRect.top
    if (drawerTop + 540 > window.innerHeight) {
      drawerTop = Math.max(margin, window.innerHeight - 560)
    }
    drawerTop = Math.max(margin, Math.min(window.innerHeight - 150, drawerTop))
    drawer.style.top = `${drawerTop}px`

    // Smooth transform origin directly from the button center
    const originX = Math.round(tabCenterX - drawerLeft)
    const originY = Math.round((tabRect.top + tabRect.height / 2) - drawerTop)
    drawer.style.transformOrigin = `${originX}px ${originY}px`

    if (this.isOpen) {
      drawer.classList.add('rm-open')
      backdrop.classList.add('rm-open')
      tab.classList.add('rm-active')
    } else {
      drawer.classList.remove('rm-open')
      backdrop.classList.remove('rm-open')
      tab.classList.remove('rm-active')
    }
  }

  private bindGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault()
        this.toggle()
      }
      if (e.key === 'Escape' && this.isOpen) {
        this.close()
      }
    })
  }

  private async handleSaveReel() {
    if (!this.currentReel?.url || !this.selectedFolderId || !this.user) {
      if (!this.currentReel?.url) {
        this.errorMessage = 'No active reel detected to save. Scroll to a reel or paste a link below.'
      } else if (!this.selectedFolderId) {
        this.errorMessage = 'Please select or create a folder first.'
      }
      this.render()
      return
    }

    // If duplicate was already flagged and button is greyed out, prevent re-submission
    if (this.duplicateFolder) {
      return
    }

    this.isSubmitting = true
    this.errorMessage = null
    this.successMessage = null
    this.duplicateFolder = null
    this.render()

    // Safety timeout: Never allow button to remain stuck on 'Saving to Folder...'
    const safetyTimer = setTimeout(() => {
      if (this.isSubmitting) {
        this.isSubmitting = false
        this.errorMessage = 'Save request timed out. Please check your connection and try again.'
        this.render()
      }
    }, 10000)

    const payload = {
      folder_id: this.selectedFolderId,
      instagram_url: this.currentReel.url,
      thumbnail_url: this.currentReel.thumbnailUrl || null,
      note: this.noteText.trim(),
      instagram_username: this.currentReel.username || null,
      instagram_caption: this.currentReel.caption || null
    }

    chrome.runtime.sendMessage({ type: 'SAVE_REEL', payload }, (res) => {
      clearTimeout(safetyTimer)
      this.isSubmitting = false

      // Case 1: Reel is duplicate! Show warning banner and grey out button to prevent duplicate attempt
      if (res?.data?.isDuplicate) {
        this.duplicateFolder = res.data.folderName || 'Folder'
        this.render()
        return
      }

      // Case 2: Successfully saved
      if (res?.success && res.data) {
        const folderName = this.folders.find((f) => f.id === this.selectedFolderId)?.name || 'Folder'
        this.successMessage = `Saved to "${folderName}"!`
        this.noteText = ''
        // Ensure warning banner is NOT shown right after adding to system!
        this.duplicateFolder = null
        chrome.storage.local.set({ lastFolderId: this.selectedFolderId })
        this.fetchRecent()
        this.fetchFolders()
      } else {
        this.errorMessage = res?.error || 'Failed to save reel'
      }
      this.render()
    })
  }

  private async handleCreateFolder(name: string) {
    if (!name.trim()) return
    chrome.runtime.sendMessage({ type: 'CREATE_FOLDER', name: name.trim() }, (res) => {
      if (res?.success && res.data) {
        const newFolder: Folder = res.data
        this.folders.unshift(newFolder)
        this.selectedFolderId = newFolder.id
        chrome.storage.local.set({ lastFolderId: newFolder.id })
        this.render()
      } else {
        alert(res?.error || 'Failed to create folder')
      }
    })
  }

  private async handleLogin(e: Event) {
    e.preventDefault()
    const emailInput = this.shadow.querySelector<HTMLInputElement>('#rm-login-email')
    const passInput = this.shadow.querySelector<HTMLInputElement>('#rm-login-pass')
    if (!emailInput || !passInput) return

    const email = emailInput.value.trim()
    const password = passInput.value
    if (!email || !password) return

    this.isSubmitting = true
    this.errorMessage = null
    this.render()

    chrome.runtime.sendMessage({ type: 'SIGN_IN', email, password }, (res) => {
      this.isSubmitting = false
      if (res?.success && res.data) {
        this.setSession(res.data)
      } else {
        this.errorMessage = res?.error || 'Sign in failed'
        this.render()
      }
    })
  }

  private handleSignOut() {
    chrome.runtime.sendMessage({ type: 'SIGN_OUT' }, () => {
      this.setSession(null)
    })
  }

  private openWebApp(path = '') {
    chrome.runtime.sendMessage({ type: 'OPEN_WEBAPP', path })
  }

  private render() {
    // Ensure selectedFolderId is valid and set if folders exist
    if (this.folders.length > 0) {
      if (!this.selectedFolderId || !this.folders.some((f) => f.id === this.selectedFolderId)) {
        this.selectedFolderId = this.folders[0].id
      }
    } else {
      this.selectedFolderId = ''
    }

    const existingDrawer = this.shadow.querySelector<HTMLElement>('.rm-drawer')
    const existingBackdrop = this.shadow.querySelector<HTMLElement>('#rm-backdrop')
    const existingTab = this.shadow.querySelector<HTMLElement>('#rm-tab')

    if (existingDrawer && existingBackdrop && existingTab) {
      // Maintain tab position if set
      if (this.tabPosition) {
        existingTab.style.left = `${this.tabPosition.left}px`
        existingTab.style.top = `${this.tabPosition.top}px`
        existingTab.style.right = 'auto'
        existingTab.style.bottom = 'auto'
      }

      // In-place update so drawer DOM node is preserved and scale animation plays smoothly
      const userBar = this.shadow.querySelector<HTMLElement>('.rm-user-bar')
      if (userBar) {
        userBar.innerHTML = `
          <div class="rm-user-info">
            <span class="rm-status-dot ${this.user ? '' : 'rm-offline'}"></span>
            <span class="rm-user-email">
              ${this.user ? this.user.email : 'Not signed in'}
            </span>
          </div>
          ${
            this.user
              ? `<button class="rm-link-btn" id="rm-btn-signout">Sign Out</button>`
              : `<span style="color:var(--rm-text-muted)">Auto-syncing...</span>`
          }
        `
        this.shadow.querySelector('#rm-btn-signout')?.addEventListener('click', () => this.handleSignOut())
      }

      const body = this.shadow.querySelector<HTMLElement>('.rm-body')
      if (body) {
        body.innerHTML = this.renderBodyContent()
      }

      this.attachBodyEventListeners()
      this.updateDrawerState()
      return
    }

    this.shadow.innerHTML = `
      <style>${sidebarCss}</style>

      <!-- Floating Top-Right Toggle Pill (Below any top ribbon) -->
      <div class="rm-toggle-tab ${this.isOpen ? 'rm-active' : ''}" id="rm-tab" title="Reel Manager (Alt+R)">
        <div class="rm-tab-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
            <line x1="7" y1="2" x2="7" y2="22"/>
            <line x1="17" y1="2" x2="17" y2="22"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <line x1="2" y1="7" x2="7" y2="7"/>
            <line x1="2" y1="17" x2="7" y2="17"/>
            <line x1="17" y1="17" x2="22" y2="17"/>
            <line x1="17" y1="7" x2="22" y2="7"/>
          </svg>
        </div>
        <span class="rm-tab-badge">Save Reel</span>
        ${this.user ? '<div class="rm-tab-pulse" title="Connected"></div>' : ''}
      </div>

      <!-- Backdrop Overlay -->
      <div class="rm-backdrop ${this.isOpen ? 'rm-open' : ''}" id="rm-backdrop"></div>

      <!-- Floating Dialog Box -->
      <aside class="rm-drawer ${this.isOpen ? 'rm-open' : ''}">
        <!-- Header -->
        <header class="rm-header">
          <div class="rm-brand">
            <div class="rm-logo-box">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </div>
            <span class="rm-brand-title">Reel Manager</span>
          </div>
          <div class="rm-header-actions">
            <button class="rm-icon-btn" id="rm-btn-webapp" title="Open Reel Manager">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </button>
            <button class="rm-icon-btn" id="rm-btn-refresh" title="Refresh Folders">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
            <button class="rm-icon-btn" id="rm-btn-close" title="Close Dialog (Esc)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </header>

        <!-- User Status Bar -->
        <div class="rm-user-bar">
          <div class="rm-user-info">
            <span class="rm-status-dot ${this.user ? '' : 'rm-offline'}"></span>
            <span class="rm-user-email">
              ${this.user ? this.user.email : 'Not signed in'}
            </span>
          </div>
          ${
            this.user
              ? `<button class="rm-link-btn" id="rm-btn-signout">Sign Out</button>`
              : `<span style="color:var(--rm-text-muted)">Auto-syncing...</span>`
          }
        </div>

        <!-- Body Content -->
        <div class="rm-body">
          ${this.renderBodyContent()}
        </div>
      </aside>
    `

    this.attachStaticEventListeners()
    this.attachBodyEventListeners()
    if (this.tabPosition) {
      const tab = this.shadow.querySelector<HTMLElement>('#rm-tab')
      if (tab) {
        tab.style.left = `${this.tabPosition.left}px`
        tab.style.top = `${this.tabPosition.top}px`
        tab.style.right = 'auto'
        tab.style.bottom = 'auto'
      }
    }
    this.updateDrawerState()
  }

  private renderBodyContent(): string {
    if (!this.user) {
      return `
        <div class="rm-login-panel">
          <h3 class="rm-login-title">Sign in to Reel Manager</h3>
          <p class="rm-login-desc">
            Save reels directly to your folders while browsing Instagram.
          </p>

          <div class="rm-sync-callout">
            💡 <strong>Auto-sync active:</strong> Open <a href="#" id="rm-sync-link" style="color:#FFF;text-decoration:underline;">Reel Manager in another tab</a> to automatically sync your login.
          </div>

          ${this.errorMessage ? `<div style="color:var(--rm-danger);font-size:12px;">${this.errorMessage}</div>` : ''}

          <form class="rm-login-form" id="rm-login-form">
            <input type="email" id="rm-login-email" class="rm-input" placeholder="Email address" required />
            <input type="password" id="rm-login-pass" class="rm-input" placeholder="Password" required />
            <button type="submit" class="rm-btn rm-btn-primary" ${this.isSubmitting ? 'disabled' : ''}>
              ${this.isSubmitting ? '<div class="rm-spinner"></div> Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      `
    }

    const usernameDisplay = this.currentReel?.username && this.currentReel.username !== 'creator'
      ? `@${this.currentReel.username}`
      : '@creator'

    return `
      <!-- Active Reel -->
      <div class="rm-section">
        <div class="rm-section-label">
          <span>Active Reel</span>
        </div>

        ${
          this.currentReel
            ? `
          <div class="rm-card">
            <div class="rm-thumbnail-container">
              ${
                this.currentReel.thumbnailUrl
                  ? `<img src="${this.currentReel.thumbnailUrl}" class="rm-thumbnail-img" alt="Thumbnail" />`
                  : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/></svg>`
              }
              <button class="rm-snap-btn" id="rm-snap-frame-btn" title="Click to freeze current video frame as cover">
                📸 Snap Frame
              </button>
            </div>
            <div class="rm-card-details">
              <div class="rm-card-header">
                <span class="rm-username-badge">${usernameDisplay}</span>
              </div>
              <p class="rm-caption-snippet">
                ${this.currentReel.caption || 'No caption available'}
              </p>
              <div class="rm-cover-status">
                ${this.currentReel.thumbnailUrl ? '✓ Cover captured' : '⏳ Detecting cover...'}
              </div>
            </div>
          </div>

          ${
            this.duplicateFolder
              ? `
            <div class="rm-duplicate-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <strong>Already on system</strong>
                <div style="font-size:11px;opacity:0.95;margin-top:2px;">
                  This reel is already present in folder: <strong>&ldquo;${this.duplicateFolder}&rdquo;</strong>
                </div>
              </div>
            </div>
          `
              : ''
          }
        `
            : `
          <div class="rm-no-reel-state">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Scroll to any Reel or paste an Instagram link:</span>
            <div class="rm-manual-input-box">
              <input type="text" id="rm-manual-url" class="rm-input" placeholder="https://instagram.com/reel/..." />
              <button class="rm-btn rm-btn-secondary rm-btn-sm" id="rm-manual-load">Load</button>
            </div>
          </div>
        `
        }
      </div>

      <!-- Target Folder Selection -->
      <div class="rm-section">
        <div class="rm-section-label">
          <span>Target Folder</span>
          <span style="font-weight:400;color:var(--rm-text-muted);">${this.folders.length} available</span>
        </div>

        ${
          this.folders.length > 0
            ? `
          <select class="rm-folder-select" id="rm-folder-dropdown">
            ${this.folders
              .map(
                (f) => `
              <option value="${f.id}" ${f.id === this.selectedFolderId ? 'selected' : ''}>
                📁 ${f.name} (${f.reels_count || 0})
              </option>
            `
              )
              .join('')}
          </select>
        `
            : `
          <div style="font-size:12px;color:var(--rm-text-muted);">No folders yet. Create your first folder below:</div>
        `
        }

        <!-- Inline Create Folder -->
        <div class="rm-folder-create-row">
          <input type="text" id="rm-new-folder-input" class="rm-input" placeholder="+ Create new folder..." />
          <button class="rm-btn rm-btn-secondary rm-btn-sm" id="rm-create-folder-btn">Add</button>
        </div>
      </div>

      <!-- Optional Personal Note -->
      <div class="rm-section">
        <div class="rm-section-label">
          <span>Personal Note (Optional)</span>
        </div>
        <textarea id="rm-note-input" class="rm-textarea" placeholder="Add ideas, tags, or reminders for this reel...">${this.noteText}</textarea>
      </div>

      <!-- Messages -->
      ${this.errorMessage ? `<div style="color:var(--rm-danger);font-size:13px;padding:8px 0;">${this.errorMessage}</div>` : ''}
      ${
        this.successMessage
          ? `
        <div class="rm-success-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <div style="flex:1;">
            <strong>${this.successMessage}</strong>
            <div style="font-size:11px;margin-top:2px;">
              <a href="#" id="rm-view-saved-link" style="color:#FFF;text-decoration:underline;">View in Reel Manager</a>
            </div>
          </div>
        </div>
      `
          : ''
      }

      <!-- Save Action Button -->
      <button 
        class="rm-btn rm-btn-primary" 
        id="rm-btn-save" 
        ${!this.currentReel || !this.selectedFolderId || this.isSubmitting || !!this.duplicateFolder ? 'disabled' : ''}
      >
        ${
          this.duplicateFolder
            ? `Already in "${this.duplicateFolder}"`
            : this.isSubmitting
            ? '<div class="rm-spinner"></div> Saving to Folder...'
            : !this.currentReel
            ? 'Scroll to a Reel to Save'
            : !this.selectedFolderId
            ? 'Select or Create a Folder'
            : `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Save Reel to Folder
        `
        }
      </button>

      <!-- Recent Saves Collapsible -->
      ${
        this.recentReels.length > 0
          ? `
        <div class="rm-section" style="margin-top:10px;">
          <div class="rm-section-label">
            <span>Recent Saves</span>
            <button class="rm-link-btn" id="rm-view-all-link">View All</button>
          </div>
          <div class="rm-recent-list">
            ${this.recentReels
              .map(
                (r) => `
              <div class="rm-recent-item" data-folder-id="${r.folder_id}">
                ${r.thumbnail_url ? `<img src="${r.thumbnail_url}" class="rm-recent-thumb" />` : '<div class="rm-recent-thumb"></div>'}
                <div class="rm-recent-info">
                  <div class="rm-recent-title">@${r.instagram_username || 'creator'}</div>
                  <div class="rm-recent-folder">📁 ${r.folder_name || 'Folder'}</div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }
    `
  }

  private attachStaticEventListeners() {
    const tab = this.shadow.querySelector<HTMLElement>('#rm-tab')
    if (tab) {
      // Restore saved position
      if (this.tabPosition) {
        tab.style.left = `${this.tabPosition.left}px`
        tab.style.top = `${this.tabPosition.top}px`
        tab.style.right = 'auto'
        tab.style.bottom = 'auto'
      }

      let isDragging = false
      let startX = 0
      let startY = 0
      let initialLeft = 0
      let initialTop = 0
      let hasDragged = false

      const startDrag = (clientX: number, clientY: number) => {
        isDragging = true
        hasDragged = false
        startX = clientX
        startY = clientY
        const rect = tab.getBoundingClientRect()
        initialLeft = rect.left
        initialTop = rect.top
        tab.classList.add('rm-dragging')
      }

      const moveDrag = (clientX: number, clientY: number) => {
        if (!isDragging) return
        const dx = clientX - startX
        const dy = clientY - startY
        if (Math.hypot(dx, dy) > 3) {
          hasDragged = true
          const rect = tab.getBoundingClientRect()
          const newLeft = Math.max(8, Math.min(window.innerWidth - rect.width - 8, initialLeft + dx))
          const newTop = Math.max(8, Math.min(window.innerHeight - rect.height - 8, initialTop + dy))
          tab.style.left = `${newLeft}px`
          tab.style.top = `${newTop}px`
          tab.style.right = 'auto'
          tab.style.bottom = 'auto'
          this.tabPosition = { left: newLeft, top: newTop }
          this.updateDrawerState()
        }
      }

      const endDrag = () => {
        if (isDragging) {
          isDragging = false
          tab.classList.remove('rm-dragging')
          if (hasDragged && this.tabPosition) {
            try {
              localStorage.setItem('rm_tab_pos', JSON.stringify(this.tabPosition))
            } catch {}
            this.updateDrawerState()
          }
        }
      }

      tab.addEventListener('dragstart', (e) => e.preventDefault())

      tab.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return
        startDrag(e.clientX, e.clientY)
      })

      window.addEventListener('mousemove', (e) => {
        moveDrag(e.clientX, e.clientY)
      }, { passive: true })

      window.addEventListener('mouseup', endDrag)

      // Touch support for dragging on touchscreen devices
      tab.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          startDrag(e.touches[0].clientX, e.touches[0].clientY)
        }
      }, { passive: true })

      window.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length === 1) {
          moveDrag(e.touches[0].clientX, e.touches[0].clientY)
        }
      }, { passive: true })

      window.addEventListener('touchend', endDrag)

      // Reposition dynamically if browser window resized
      window.addEventListener('resize', () => {
        if (this.tabPosition) {
          const rect = tab.getBoundingClientRect()
          const newLeft = Math.max(8, Math.min(window.innerWidth - rect.width - 8, this.tabPosition.left))
          const newTop = Math.max(8, Math.min(window.innerHeight - rect.height - 8, this.tabPosition.top))
          this.tabPosition = { left: newLeft, top: newTop }
          tab.style.left = `${newLeft}px`
          tab.style.top = `${newTop}px`
        }
        this.updateDrawerState()
      })

      tab.addEventListener('click', (e) => {
        if (hasDragged) {
          hasDragged = false
          e.preventDefault()
          e.stopPropagation()
          return
        }
        this.toggle()
      })
    }

    // Close button & backdrop
    this.shadow.querySelector('#rm-btn-close')?.addEventListener('click', () => this.close())
    this.shadow.querySelector('#rm-backdrop')?.addEventListener('click', () => this.close())

    // Web App launch
    this.shadow.querySelector('#rm-btn-webapp')?.addEventListener('click', () => this.openWebApp())

    // Refresh folders
    this.shadow.querySelector('#rm-btn-refresh')?.addEventListener('click', () => {
      this.fetchFolders()
      this.fetchRecent()
    })
  }

  private attachBodyEventListeners() {
    // Snap current video frame
    this.shadow.querySelector('#rm-snap-frame-btn')?.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (this.frameCapturer) {
        const snap = this.frameCapturer()
        if (snap && this.currentReel) {
          this.currentReel.thumbnailUrl = snap
          const match = this.queue.find((item) => item.shortcode === this.currentReel?.shortcode)
          if (match) {
            match.thumbnailUrl = snap
          }
          this.render()
        }
      }
    })

    // Web App links inside body
    this.shadow.querySelector('#rm-sync-link')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.openWebApp()
    })
    this.shadow.querySelector('#rm-view-all-link')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.openWebApp('/dashboard')
    })
    this.shadow.querySelector('#rm-view-saved-link')?.addEventListener('click', (e) => {
      e.preventDefault()
      if (this.selectedFolderId) {
        this.openWebApp(`/folder/${this.selectedFolderId}`)
      } else {
        this.openWebApp()
      }
    })

    // Sign out
    this.shadow.querySelector('#rm-btn-signout')?.addEventListener('click', () => this.handleSignOut())

    // Login form
    this.shadow.querySelector('#rm-login-form')?.addEventListener('submit', (e) => this.handleLogin(e))

    // Folder selection
    const folderDropdown = this.shadow.querySelector<HTMLSelectElement>('#rm-folder-dropdown')
    folderDropdown?.addEventListener('change', () => {
      this.selectedFolderId = folderDropdown.value
      chrome.storage.local.set({ lastFolderId: folderDropdown.value })
    })

    // Create folder
    const newFolderInput = this.shadow.querySelector<HTMLInputElement>('#rm-new-folder-input')
    const createFolderBtn = this.shadow.querySelector('#rm-create-folder-btn')
    const submitCreateFolder = () => {
      if (newFolderInput && newFolderInput.value.trim()) {
        this.handleCreateFolder(newFolderInput.value.trim())
        newFolderInput.value = ''
      }
    }
    createFolderBtn?.addEventListener('click', submitCreateFolder)
    newFolderInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        submitCreateFolder()
      }
    })

    // Note input
    const noteInput = this.shadow.querySelector<HTMLTextAreaElement>('#rm-note-input')
    noteInput?.addEventListener('input', () => {
      this.noteText = noteInput.value
    })

    // Save button
    this.shadow.querySelector('#rm-btn-save')?.addEventListener('click', () => this.handleSaveReel())

    // Manual load button
    const manualInput = this.shadow.querySelector<HTMLInputElement>('#rm-manual-url')
    const manualBtn = this.shadow.querySelector('#rm-manual-load')
    const loadManual = () => {
      if (!manualInput?.value.trim()) return
      const rawUrl = manualInput.value.trim()
      const match = rawUrl.match(/\/(?:reels?|p|tv|share\/reel)\/([A-Za-z0-9_-]+)/)
      const candidate = match ? match[1] : rawUrl.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '')
      const RESERVED_SLUGS = new Set(['reel', 'reels', 'p', 'tv', 'share', 'explore', 'stories', 'videos', 'audio', 'channel', 'direct', 'feed', 'accounts'])
      if (!candidate || candidate.length < 5 || RESERVED_SLUGS.has(candidate.toLowerCase()) || !/^[A-Za-z0-9_-]+$/.test(candidate)) {
        this.errorMessage = 'Please enter a valid Instagram reel link (e.g. instagram.com/reel/xyz)'
        this.render()
        return
      }
      this.setCurrentReel({
        url: `https://www.instagram.com/reel/${candidate}/`,
        shortcode: candidate,
        username: 'instagram_user',
        caption: ''
      })
    }
    manualBtn?.addEventListener('click', loadManual)
    manualInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        loadManual()
      }
    })

    // Recent items click
    this.shadow.querySelectorAll('.rm-recent-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault()
        const folderId = (el as HTMLElement).dataset.folderId
        if (folderId) {
          this.openWebApp(`/folder/${folderId}`)
        }
      })
    })
  }
}
