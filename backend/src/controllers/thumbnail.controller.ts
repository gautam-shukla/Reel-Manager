import { Request, Response } from 'express'
import { fetchThumbnail, getRandomPlaceholder } from '../services/thumbnail.service.js'

export async function handleGetThumbnail(req: Request, res: Response): Promise<void> {
  const { url } = req.body || {}

  if (!url) {
    res.status(400).json({ error: 'URL is required' })
    return
  }

  try {
    const result = await fetchThumbnail(url)
    res.status(200).json(result)
  } catch (error) {
    console.error('[Reel Manager] Error processing thumbnail request:', error)
    res.status(200).json({
      thumbnail: getRandomPlaceholder(),
      username: 'instagram_user',
      caption: ''
    })
  }
}
