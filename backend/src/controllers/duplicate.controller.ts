import { Request, Response } from 'express'
import { checkDuplicate } from '../services/duplicate.service.js'

export async function handleCheckDuplicate(req: Request, res: Response): Promise<void> {
  const url = (req.body?.url || req.query?.url || req.body?.shortcode || req.query?.shortcode) as string
  const userId = (req.body?.user_id || req.query?.user_id || req.body?.userId) as string | undefined
  const token = (req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.token) as string | undefined

  if (!url) {
    res.status(400).json({ error: 'URL or shortcode is required' })
    return
  }

  try {
    const result = await checkDuplicate(url, userId, token)
    res.status(200).json(result)
  } catch (error: any) {
    console.error('[Reel Manager] Error checking duplicate reel:', error)
    res.status(500).json({
      isDuplicate: false,
      error: error.message || 'Failed to check duplicate'
    })
  }
}
