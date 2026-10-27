export interface Folder {
  id: string
  name: string
  user_id: string
  created_at: string
  parent_id?: string | null
  is_deleted?: boolean
  reels_count?: number
}

export interface ReelPayload {
  user_id: string
  folder_id: string
  original_folder_id?: string
  instagram_url: string
  thumbnail_url?: string | null
  note?: string
  instagram_username?: string | null
  instagram_caption?: string | null
}

export interface SavedReel {
  id: string
  instagram_url: string
  thumbnail_url?: string | null
  note?: string
  instagram_username?: string | null
  instagram_caption?: string | null
  folder_id: string
  folder_name?: string
  created_at: string
}

export interface DetectedReel {
  url: string
  shortcode: string
  thumbnailUrl?: string | null
  username?: string | null
  caption?: string | null
  timestamp?: number
}

export interface UserProfile {
  id: string
  email: string
  username?: string
}

export interface AuthSession {
  access_token: string
  refresh_token?: string
  expires_at?: number
  user: UserProfile
}

export type ExtensionMessage =
  | { type: 'SYNC_SESSION'; session: AuthSession; webappUrl?: string }
  | { type: 'GET_SESSION' }
  | { type: 'SIGN_IN'; email: string; password: string }
  | { type: 'SIGN_OUT' }
  | { type: 'FETCH_FOLDERS' }
  | { type: 'CREATE_FOLDER'; name: string }
  | { type: 'SAVE_REEL'; payload: Omit<ReelPayload, 'user_id'> }
  | { type: 'FETCH_RECENT' }
  | { type: 'FETCH_THUMBNAIL'; url: string }
  | { type: 'OPEN_WEBAPP'; path?: string }
  | { type: 'REEL_DETECTED'; reel: DetectedReel }
  | { type: 'CHECK_DUPLICATE'; url?: string; shortcode?: string }
  | { type: 'GET_CONFIG' }
  | { type: 'SET_WEBAPP_URL'; url: string }
