import { app } from './app.js'

const PORT = Number(process.env.PORT) || 5000

const server = app.listen(PORT, () => {
  console.log(`[Reel Manager API] Server is running on http://localhost:${PORT}`)
  console.log(`[Reel Manager API] Health check: http://localhost:${PORT}/api/health`)
})

process.on('SIGTERM', () => {
  console.log('[Reel Manager API] SIGTERM signal received: closing HTTP server')
  server.close(() => {
    console.log('[Reel Manager API] HTTP server closed')
  })
})
