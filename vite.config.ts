import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { execFile } from 'child_process'
import { existsSync } from 'fs'

export default defineConfig(({ mode }) => {
  // Load env file from the project root
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    resolve: {
      alias: {
        src: path.resolve(__dirname, './src'),
        assets: path.resolve(__dirname, './src/assets'),
        components: path.resolve(__dirname, './src/components'),
        contexts: path.resolve(__dirname, './src/contexts'),
        hooks: path.resolve(__dirname, './src/hooks'),
        integrations: path.resolve(__dirname, './src/integrations'),
        lib: path.resolve(__dirname, './src/lib'),
        pages: path.resolve(__dirname, './src/pages'),
        types: path.resolve(__dirname, './src/types'),
        utils: path.resolve(__dirname, './src/utils'),
        constants: path.resolve(__dirname, './src/constants')
      }
    },
    server: {
      port: 3000,
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const urlObj = new URL(req.url || '', `http://${req.headers.host}`)
          const pathname = urlObj.pathname

          // 1. GET /api/proxy-image?url=...
          if (pathname === '/api/proxy-image' && req.method === 'GET') {
            const imageUrl = urlObj.searchParams.get('url')
            if (!imageUrl) {
              res.statusCode = 400
              res.end('Missing URL parameter')
              return
            }

            try {
              const imageResponse = await fetch(imageUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Referer': 'https://www.instagram.com/'
                }
              })

              if (!imageResponse.ok) {
                res.statusCode = imageResponse.status
                res.end(`Failed to fetch image: ${imageResponse.statusText}`)
                return
              }

              const contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg'
              const arrayBuffer = await imageResponse.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)

              res.setHeader('Content-Type', contentType)
              res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200')
              res.statusCode = 200
              res.end(buffer)
            } catch (err) {
              res.statusCode = 500
              res.end('Error proxying image')
            }
            return
          }

          // 2. POST /api/thumbnail
          if (pathname === '/api/thumbnail' && req.method === 'POST') {
            try {
              const bodyText = await new Promise<string>((resolve, reject) => {
                let data = ''
                req.on('data', chunk => { data += chunk })
                req.on('end', () => resolve(data))
                req.on('error', err => reject(err))
              })

              const parsedBody = JSON.parse(bodyText || '{}')
              const { url } = parsedBody

              if (!url) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'URL is required' }))
                return
              }

              const placeholders = [
                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1618005198143-e528346d9a59?q=80&w=600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=600&auto=format&fit=crop'
              ]

              // 1. Try to fetch using Python script (instaloader)
              const projectRoot = process.cwd()
              const scriptPath = path.resolve(projectRoot, './scripts/get_thumbnail.py')
              const localPython = process.platform === 'win32'
                ? path.resolve(projectRoot, './.venv/Scripts/python.exe')
                : path.resolve(projectRoot, './.venv/bin/python')
              const pythonExecutable = existsSync(localPython) ? localPython : 'python'

              console.log(`[Reel Manager] Using Python executable: ${pythonExecutable}`)
              console.log(`[Reel Manager] Executing script: ${scriptPath} with URL: ${url}`)

              const pythonResult = await new Promise<{ thumbnail_url: string; username: string } | null>((resolve) => {
                execFile(pythonExecutable, [scriptPath, url], { timeout: 25000 }, (error, stdout, stderr) => {
                  if (error) {
                    console.error('Error running python get_thumbnail script:', error)
                    console.error('Script stdout:', stdout)
                    console.error('Script stderr:', stderr)
                    resolve(null)
                    return
                  }
                  try {
                    const startIdx = stdout.indexOf('{')
                    const endIdx = stdout.lastIndexOf('}')
                    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
                      throw new Error('No JSON object found in stdout')
                    }
                    const data = JSON.parse(stdout.slice(startIdx, endIdx + 1))
                    if (data.thumbnail_url) {
                      resolve(data)
                      return
                    }
                  } catch (parseErr) {
                    console.error('Failed to parse JSON from python script output:', parseErr, stdout)
                  }
                  resolve(null)
                })
              })

              if (pythonResult) {
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ 
                  thumbnail: pythonResult.thumbnail_url,
                  username: pythonResult.username
                }))
                return
              }

              // 2. Fallback to Instagram oEmbed if available
              const token = env.NEXT_PUBLIC_INSTAGRAM_OEMBED_TOKEN || env.INSTAGRAM_OEMBED_TOKEN

              if (token) {
                const oembedUrl = `https://graph.facebook.com/v17.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${token}`
                const oembedResponse = await fetch(oembedUrl)
                if (oembedResponse.ok) {
                  const data = await oembedResponse.json()
                  if (data.thumbnail_url) {
                    res.statusCode = 200
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({ thumbnail: data.thumbnail_url }))
                    return
                  }
                }
              }

              // 3. Ultimate Fallback to random placeholder
              const randomIndex = Math.floor(Math.random() * placeholders.length)
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ thumbnail: placeholders[randomIndex] }))
            } catch (err) {
              const placeholders = [
                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1618005198143-e528346d9a59?q=80&w=600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=600&auto=format&fit=crop'
              ]
              const randomIndex = Math.floor(Math.random() * placeholders.length)
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ thumbnail: placeholders[randomIndex] }))
            }
            return
          }

          next()
        })
      }
    }
  }
})
