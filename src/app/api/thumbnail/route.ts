import { NextRequest, NextResponse } from 'next/server'

const PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1618005198143-e528346d9a59?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=600&auto=format&fit=crop'
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const token = process.env.NEXT_PUBLIC_INSTAGRAM_OEMBED_TOKEN || process.env.INSTAGRAM_OEMBED_TOKEN
    
    if (token) {
      const oembedUrl = `https://graph.facebook.com/v17.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${token}`
      const res = await fetch(oembedUrl)
      if (res.ok) {
        const data = await res.json()
        if (data.thumbnail_url) {
          return NextResponse.json({ thumbnail: data.thumbnail_url })
        }
      }
    }

    // Fallback: Pick a random beautiful dark abstract placeholder
    const randomIndex = Math.floor(Math.random() * PLACEHOLDERS.length)
    return NextResponse.json({ thumbnail: PLACEHOLDERS[randomIndex] })

  } catch (error) {
    console.error('Error fetching thumbnail:', error)
    const randomIndex = Math.floor(Math.random() * PLACEHOLDERS.length)
    return NextResponse.json({ thumbnail: PLACEHOLDERS[randomIndex] })
  }
}
