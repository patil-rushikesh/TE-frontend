import type { FiveWhyChainItem, IshikawaCategory } from './root-cause'

// ─── Request / Response Types ────────────────────────────────────────────────

export interface SecurityTriplet {
  user_id: string
  master_user_id: string
  org_id: string
}

export interface SaveAnalysisRequest extends SecurityTriplet {
  domain: string
  query: string
  past_record: number
  session_title: string
  ticket_ref?: string
  part_number?: string
  ishikawa: IshikawaCategory[]
  analysis: FiveWhyChainItem[]
  main_cause?: string[]
}

export interface SaveAnalysisResponse {
  success: boolean
  message: string
  neo4j_ps_id?: string
  neo4j_content_count?: number
  supabase_session_id?: string
  supabase_ishikawa_id?: string
  supabase_five_whys_id?: string
  supabase_skipped?: boolean
}

export interface HistoryRequest extends SecurityTriplet { }

export interface HistorySession {
  session_id: string
  query: string
  domain: string
  title: string
  created_at: string
  cause_count: number
  root_causes: string[]
  main_cause?: string[]
  ishikawa: IshikawaCategory[]
  five_whys: FiveWhyChainItem[]
}

export interface HistoryResponse {
  success: boolean
  message: string | null
  sessions: HistorySession[]
}

// ─── Local storage key for security triplet ───────────────────────────────────
const TRIPLET_KEY = 'te_security_triplet'

export function getStoredTriplet(): SecurityTriplet | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(TRIPLET_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SecurityTriplet
  } catch {
    return null
  }
}

export function storeOrGetTriplet(): SecurityTriplet {
  const existing = getStoredTriplet()
  if (existing) return existing

  // Derive from auth_token user data if possible
  try {
    const userRaw = localStorage.getItem('auth_user')
    if (userRaw) {
      const u = JSON.parse(userRaw) as {
        id?: string
        user_id?: string
        master_user_id?: string
        org_id?: string
      }
      const triplet: SecurityTriplet = {
        user_id: u.id ?? u.user_id ?? crypto.randomUUID(),
        master_user_id: u.master_user_id ?? u.id ?? u.user_id ?? crypto.randomUUID(),
        org_id: u.org_id ?? crypto.randomUUID(),
      }
      localStorage.setItem(TRIPLET_KEY, JSON.stringify(triplet))
      return triplet
    }
  } catch {
    // ignore
  }

  // Fallback: generate stable UUIDs for this browser session
  const triplet: SecurityTriplet = {
    user_id: crypto.randomUUID(),
    master_user_id: crypto.randomUUID(),
    org_id: crypto.randomUUID(),
  }
  localStorage.setItem(TRIPLET_KEY, JSON.stringify(triplet))
  return triplet
}

// ─── API client ───────────────────────────────────────────────────────────────

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const API_ROOT = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`

async function historyRequest<T>(path: string, body: unknown): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_ROOT}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => ({ detail: 'Unable to parse server response.' }))

  console.log(payload);

  if (!response.ok) {
    const detail =
      payload && typeof payload.detail === 'string'
        ? payload.detail
        : `Request failed with status ${response.status}.`
    throw new Error(detail)
  }

  return payload as T
}

export const historyApi = {
  saveAnalysis(body: SaveAnalysisRequest) {
    return historyRequest<SaveAnalysisResponse>('/save', body)
  },
  fetchHistory(body: HistoryRequest) {
    return historyRequest<HistoryResponse>('/history', body)
  },
}
