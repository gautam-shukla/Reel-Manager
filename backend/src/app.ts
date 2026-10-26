import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { existsSync } from 'fs'
import { apiRouter } from './routes/api.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env from backend folder or project root
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env')
]

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath })
    break
  }
}

export const app = express()

// Global middlewares
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve static thumbnails directly if requested
const thumbnailsDir =
  process.env.THUMBNAIL_DIR ||
  path.resolve(__dirname, '../../frontend/public/thumbnails')

if (existsSync(thumbnailsDir)) {
  app.use('/thumbnails', express.static(thumbnailsDir))
}

// API Routes
app.use('/api', apiRouter)

// Root health & metadata
app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'Reel Manager API',
    status: 'running',
    endpoints: {
      health: '/api/health',
      proxyImage: '/api/proxy-image?url=<image-url>',
      thumbnail: 'POST /api/thumbnail { url }'
    }
  })
})
