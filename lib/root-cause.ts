export const CANONICAL_BONES = [
  'Man',
  'Method',
  'Machine',
  'Material',
  'Measurement',
  'Environment',
] as const

export type CanonicalBone = (typeof CANONICAL_BONES)[number]

export type CauseStatus = 'confirmed' | 'possible' | 'excluded' | 'na'

export interface IshikawaResultItem {
  sub_category: string
  cause: string
  evidence: string
  severity: string
  immediate_action: boolean
}

export interface IshikawaCategory {
  id: number
  category: string
  result: IshikawaResultItem[]
}

export interface RootCauseProblemRequest {
  domain: string
  query: string
  past_record: number
}

export interface RootCauseProblemResponse {
  success: boolean
  ishikawa: IshikawaCategory[]
}

export interface RootCauseRegenerateRequest extends RootCauseProblemRequest {
  locked_result: IshikawaCategory[]
}

export interface RootCauseRegenerateResponse {
  success: boolean
  ishikawa: IshikawaCategory[]
}

export interface FiveWhyStep {
  level: number
  question: string
  answer: string
}

export interface FiveWhyChainItem {
  problem_id: string
  why_chain: FiveWhyStep[]
  root_cause: string
  confidence: number
}

export interface RootCauseFiveWhyRequest extends RootCauseProblemRequest {
  ishikawa: IshikawaCategory[]
}

export interface RootCauseFiveWhyResponse {
  success: boolean
  analysis: FiveWhyChainItem[]
}

export interface RootCauseRegenerateFiveWhyRequest
  extends RootCauseFiveWhyRequest {
  locked_analysis: FiveWhyChainItem[]
}

export interface RootCauseFinalizeRequest {
  domain: string
  query: string
  ishikawa: IshikawaCategory[]
  analysis: FiveWhyChainItem[]
}

export interface RootCauseFinalizeResponse {
  success: boolean
  summary: Record<string, unknown>
}

export function createEmptyIshikawaItem(): IshikawaResultItem {
  return {
    sub_category: '',
    cause: '',
    evidence: '',
    severity: '',
    immediate_action: false,
  }
}

function sanitizeIshikawaItem(item: Partial<IshikawaResultItem> | null | undefined) {
  const severity = typeof item?.severity === 'string' ? item.severity : ''
  // Derive immediate_action from severity if not explicitly provided by the API
  const immediateAction =
    typeof item?.immediate_action === 'boolean'
      ? item.immediate_action
      : ['high', 'critical'].includes(severity.trim().toLowerCase())

  return {
    sub_category: typeof item?.sub_category === 'string' ? item.sub_category : '',
    cause: typeof item?.cause === 'string' ? item.cause : '',
    evidence: typeof item?.evidence === 'string' ? item.evidence : '',
    severity,
    immediate_action: immediateAction,
  }
}

export function isMeaningfulIshikawaItem(item: IshikawaResultItem) {
  return Boolean(
    item.sub_category.trim() ||
      item.cause.trim() ||
      item.evidence.trim() ||
      item.severity.trim(),
  )
}

const MIN_RESULTS_PER_BONE = 3

export function normalizeIshikawaCategories(categories: IshikawaCategory[] | null | undefined) {
  const byCategory = new Map(
    (categories ?? []).map((category) => [
      category.category.toLowerCase(),
      {
        id: category.id,
        category: category.category,
        result: (category.result ?? []).map((item) => sanitizeIshikawaItem(item)),
      },
    ]),
  )

  return CANONICAL_BONES.map((bone, index) => {
    const existing = byCategory.get(bone.toLowerCase())
    const result = existing?.result ?? []

    // Pad to at least MIN_RESULTS_PER_BONE so all sub-fields are visible in the table
    while (result.length < MIN_RESULTS_PER_BONE) {
      result.push(createEmptyIshikawaItem())
    }

    return {
      id: existing?.id ?? index + 1,
      category: bone,
      result,
    }
  })
}

function normalizeWhyChain(steps: FiveWhyStep[] | null | undefined) {
  const stepMap = new Map(
    (steps ?? []).map((step) => [
      typeof step.level === 'number' ? step.level : 0,
      {
        level: typeof step.level === 'number' ? step.level : 0,
        question: typeof step.question === 'string' ? step.question : '',
        answer: typeof step.answer === 'string' ? step.answer : '',
      },
    ]),
  )

  return Array.from({ length: 5 }, (_, index) => {
    const level = index + 1
    const step = stepMap.get(level)

    return {
      level,
      question: step?.question ?? '',
      answer: step?.answer ?? '',
    }
  })
}

export function normalizeFiveWhyAnalysis(items: FiveWhyChainItem[] | null | undefined) {
  return (items ?? []).map((item, index) => ({
    problem_id:
      typeof item.problem_id === 'string' || typeof item.problem_id === 'number'
        ? String(item.problem_id)
        : `cause-${index + 1}`,
    why_chain: normalizeWhyChain(item.why_chain),
    root_cause: typeof item.root_cause === 'string' ? item.root_cause : '',
    confidence:
      typeof item.confidence === 'number' && Number.isFinite(item.confidence)
        ? item.confidence
        : 0,
  }))
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const API_ROOT = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`

async function apiRequest<T>(path: string, body: unknown, timeoutMs = 120_000): Promise<T> {
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), timeoutMs)

  // Get auth token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_ROOT}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const payload = await response
      .json()
      .catch(() => ({ detail: 'Unable to parse server response.' }))

    if (!response.ok) {
      const detail =
        payload && typeof payload.detail === 'string'
          ? payload.detail
          : `Request failed with status ${response.status}.`

      throw new Error(detail)
    }

    return payload as T
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s. The analysis is taking longer than expected — please try again.`)
    }
    throw err
  } finally {
    clearTimeout(timerId)
  }
}

export const rootCauseApi = {
  generateProblem(body: RootCauseProblemRequest) {
    // Ishikawa generation can take up to 15 minutes on slow hardware
    return apiRequest<RootCauseProblemResponse>('/problem', body, 960_000)
  },
  regenerateIshikawa(body: RootCauseRegenerateRequest) {
    return apiRequest<RootCauseRegenerateResponse>('/regenerate', body, 960_000)
  },
  generateFiveWhy(body: RootCauseFiveWhyRequest) {
    return apiRequest<RootCauseFiveWhyResponse>('/gen-five-why', body, 960_000)
  },
  regenerateFiveWhy(body: RootCauseRegenerateFiveWhyRequest) {
    return apiRequest<RootCauseFiveWhyResponse>('/regenerate-five-why', body, 960_000)
  },
  finalizeAnalysis(body: RootCauseFinalizeRequest) {
    return apiRequest<RootCauseFinalizeResponse>('/finalize', body, 180_000)
  },
}

export function getRootCauseApiBaseUrl() {
  return API_ROOT
}
