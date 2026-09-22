import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://wfptwjorlqtaizpngopk.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ClqHllu2_8R_DxCkdzOAgg_uPltwH5h'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type IndexedDocument = {
  id: string
  url: string
  title: string
  domain: string
  category?: string
  page_type?: string
  summary: string
  topics?: string[]
  tags?: string[]
  indexed_at?: string
  http_status?: number
}
