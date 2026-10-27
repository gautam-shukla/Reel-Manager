import { createBrowserClient } from '@supabase/ssr'

const DEFAULT_SUPABASE_URL = 'https://jyxukgnvceauicdiuyuo.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_s1w00m2nAYGaZW9H5cXfnQ_2J1WO_pi'

function getClientInstance() {
  const url =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL

  const anonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY

  return createBrowserClient(url, anonKey)
}

let clientInstance: ReturnType<typeof getClientInstance> | null = null

export function createClient() {
  if (!clientInstance) {
    clientInstance = getClientInstance()
  }
  return clientInstance
}
