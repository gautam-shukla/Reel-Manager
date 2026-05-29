export interface Folder {
  id: string
  name: string
  created_at: string
  reels?: { count: number }[]
  reelsCount?: number
  parent_id?: string | null
  is_deleted?: boolean
  deleted_at?: string | null
  updated_at?: string
}

export interface Reel {
  id: string
  instagram_url: string
  thumbnail_url: string | null
  note: string
  created_at: string
  updated_at?: string
}
