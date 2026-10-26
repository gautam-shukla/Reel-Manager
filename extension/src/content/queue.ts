export interface CapturedReelEntry {
  shortcode: string
  url: string
  thumbnailUrl: string
  username: string
  caption: string
  capturedAt: number
}

/**
 * FIFO Queue that keeps captures of the last 4 reels viewed on the page.
 * When a 5th reel is loaded, the oldest capture is automatically dropped.
 */
export class ReelCaptureQueue {
  private static readonly MAX_SIZE = 4
  private queue: CapturedReelEntry[] = []

  public add(entry: CapturedReelEntry): CapturedReelEntry {
    // If shortcode already exists, update with latest data and keep as active
    const existingIndex = this.queue.findIndex((item) => item.shortcode === entry.shortcode)
    if (existingIndex !== -1) {
      const existing = this.queue[existingIndex]
      this.queue.splice(existingIndex, 1)
      const updated: CapturedReelEntry = {
        ...existing,
        ...entry,
        thumbnailUrl: entry.thumbnailUrl || existing.thumbnailUrl,
        username: (entry.username && entry.username !== 'creator') ? entry.username : existing.username,
        caption: entry.caption || existing.caption,
        capturedAt: Date.now()
      }
      this.queue.push(updated)
      return updated
    }

    // Maintain max 4 entries: shift out oldest when 5th arrives
    while (this.queue.length >= ReelCaptureQueue.MAX_SIZE) {
      const dropped = this.queue.shift()
      console.log(`[Reel Manager Queue] Dropped oldest capture: ${dropped?.shortcode}`)
    }

    this.queue.push(entry)
    console.log(`[Reel Manager Queue] Added capture for ${entry.shortcode}. Total in queue: ${this.queue.length}/4`)
    return entry
  }

  public get(shortcode: string): CapturedReelEntry | undefined {
    return this.queue.find((item) => item.shortcode === shortcode)
  }

  public getLatest(): CapturedReelEntry | undefined {
    return this.queue.length > 0 ? this.queue[this.queue.length - 1] : undefined
  }

  public getAll(): CapturedReelEntry[] {
    return [...this.queue]
  }
}
