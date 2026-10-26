import { Request, Response } from 'express'

export async function handleProxyImage(req: Request, res: Response): Promise<void> {
  const imageUrl = req.query.url as string | undefined

  if (!imageUrl) {
    res.status(400).send('Missing URL parameter')
    return
  }

  try {
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://www.instagram.com/'
      }
    })

    if (!imageResponse.ok) {
      res.status(imageResponse.status).send(`Failed to fetch image: ${imageResponse.statusText}`)
      return
    }

    const contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg'
    const arrayBuffer = await imageResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200')
    res.status(200).send(buffer)
  } catch (err) {
    console.error('[Reel Manager] Error proxying image:', err)
    res.status(500).send('Error proxying image')
  }
}
