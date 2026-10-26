import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'

function copyExtensionAssets() {
  return {
    name: 'copy-extension-assets',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist')
      fs.mkdirSync(distDir, { recursive: true })

      // Copy manifest.json
      const manifestSrc = path.resolve(__dirname, 'manifest.json')
      const manifestDest = path.resolve(distDir, 'manifest.json')
      if (fs.existsSync(manifestSrc)) {
        fs.copyFileSync(manifestSrc, manifestDest)
      }

      // Copy icons
      const iconsSrc = path.resolve(__dirname, 'icons')
      const iconsDest = path.resolve(distDir, 'icons')
      if (fs.existsSync(iconsSrc)) {
        fs.mkdirSync(iconsDest, { recursive: true })
        for (const file of fs.readdirSync(iconsSrc)) {
          fs.copyFileSync(path.join(iconsSrc, file), path.join(iconsDest, file))
        }
      }

      // Move popup.html from dist/src/popup/popup.html to dist/popup.html if emitted nested
      const nestedPopup = path.resolve(distDir, 'src/popup/popup.html')
      const targetPopup = path.resolve(distDir, 'popup.html')
      if (fs.existsSync(nestedPopup)) {
        let htmlContent = fs.readFileSync(nestedPopup, 'utf-8')
        // Ensure relative asset paths point to adjacent files
        htmlContent = htmlContent.replace(/src="[^"]*popup\.js"/g, 'src="./popup.js"')
        htmlContent = htmlContent.replace(/href="[^"]*popup\.css"/g, 'href="./popup.css"')
        fs.writeFileSync(targetPopup, htmlContent, 'utf-8')
        fs.rmSync(path.resolve(distDir, 'src'), { recursive: true, force: true })
      }
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [copyExtensionAssets()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/popup/popup.html'),
        background: path.resolve(__dirname, 'src/background/background.ts'),
        'content-instagram': path.resolve(__dirname, 'src/content/instagram.ts'),
        'content-webapp': path.resolve(__dirname, 'src/content/webapp-bridge.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
})
