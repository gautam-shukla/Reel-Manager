# 🎬 Reel Manager — Chrome Extension

A companion Chrome Extension that brings **Reel Manager** directly to Instagram. It docks side-by-side with your Instagram feed, automatically detects the reel you're watching, and lets you save it to any folder in your Reel Manager account with a single click.

---

## ✨ Features

- **⚡ In-Page Side-by-Side Dock**:
  - Discreet, floating edge tab on the right side of Instagram.
  - Press **`Alt + R`** (or `Option + R` on Mac) anywhere on Instagram to slide the dock open/closed.
  - Clean Vercel monochromatic dark theme fully isolated with **Shadow DOM** (no CSS clashes with Instagram).
- **🎯 Smart Reel Auto-Detection**:
  - Automatically identifies the active Reel as you scroll through `instagram.com/reels/`, `/reel/<id>`, or feed reels.
  - Extracts portrait thumbnail (9:16), creator `@username`, and caption snippet.
  - Manual URL paste box for saving any reel link directly.
- **⚡ In-Feed Quick Save Buttons**:
  - Injects a native-looking Reel Manager action button next to Instagram's Like/Comment/Share buttons on every reel.
- **📁 Folder Management**:
  - Real-time dropdown of your active folders with reel counts.
  - Inline **"+ Create Folder"** input to create new categories without leaving Instagram.
  - Remembers your last used folder.
- **🔐 Seamless Authentication**:
  - **Auto-Sync:** If you are logged into Reel Manager on `http://localhost:3000` (or your deployed URL), the extension automatically syncs your login session.
  - **Direct Login:** Fallback email and password login form right inside the dock drawer or toolbar popup.
- **📝 Personal Notes**:
  - Add optional notes, tags, or reminders before saving.
- **🕒 Recent Saves List**:
  - View your recently saved reels with direct links to view them in Reel Manager.

---

## 🚀 How to Install in Chrome

1. **Build the extension**:
   ```bash
   npm run build:extension
   # Or from monorepo root:
   npm run build
   ```

2. **Load into Google Chrome / Chromium / Brave / Edge**:
   1. Open Chrome and navigate to: `chrome://extensions`
   2. Turn on **Developer mode** (toggle switch in the top-right corner).
   3. Click the **Load unpacked** button in the top-left.
   4. Select the `extension/dist` folder inside this project:
      ```text
      e:\Programming\Projects\Reel_Manager\extension\dist
      ```
   5. The **Reel Manager — Instagram Reels Saver** extension will now be active in your browser!

---

## 📖 How to Use

1. **Sign In**:
   - Open [Reel Manager](http://localhost:3000) and sign into your account. The extension automatically detects your session.
   - Alternatively, click the Reel Manager extension icon in the Chrome toolbar or open the side dock on Instagram to sign in with your email and password.

2. **Browse Instagram**:
   - Go to [Instagram Reels](https://www.instagram.com/reels/).
   - Click the **Save Reel** tab on the right edge of the screen or press **`Alt + R`**.
   - As you scroll through reels, the preview card updates automatically.
   - Select your target folder (or type a new folder name and press Enter).
   - Click **"Save Reel to Folder"**!
