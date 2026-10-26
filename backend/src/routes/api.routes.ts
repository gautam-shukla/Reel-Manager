import { Router } from 'express'
import { handleGetThumbnail } from '../controllers/thumbnail.controller.js'
import { handleProxyImage } from '../controllers/proxy.controller.js'
import { handleCheckDuplicate } from '../controllers/duplicate.controller.js'

export const apiRouter = Router()

// Health check endpoint
apiRouter.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'reel-manager-backend',
    timestamp: new Date().toISOString()
  })
})

// Image proxy endpoint: GET /api/proxy-image?url=...
apiRouter.get('/proxy-image', handleProxyImage)

// Reel thumbnail scraper/fetcher: POST /api/thumbnail
apiRouter.post('/thumbnail', handleGetThumbnail)

// Duplicate reel checker: POST /api/check-duplicate & GET /api/check-duplicate
apiRouter.post('/check-duplicate', handleCheckDuplicate)
apiRouter.get('/check-duplicate', handleCheckDuplicate)
