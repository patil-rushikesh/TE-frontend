'use client'

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, FileText, History, Loader2, MessageCircle, RefreshCw, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

import Chatbot from '@/components/chatbot'
import EightDManager from '@/components/eightd-manager'
import { FiveWhyAnalysis } from '@/components/five-why-analysis'
import { HistorySidebar } from '@/components/history-sidebar'
import { IshikawaDiagram } from '@/components/ishikawa-diagram'
import { IshikawaImageRequest } from '@/components/ishikawa-image-request'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { historyApi, storeOrGetTriplet } from '@/lib/history-api'
import {
  type FiveWhyChainItem,
  type IshikawaCategory,
  getRootCauseApiBaseUrl,
  normalizeFiveWhyAnalysis,
  normalizeIshikawaCategories,
  rootCauseApi,
} from '@/lib/root-cause'

const CURRENT_YEAR = new Date().getFullYear()

const EXAMPLES = [
  'Customer complaints about inconsistent product quality in final inspection',
  'Repeated downtime on the filling line during peak production hours',
  'Late project delivery caused by cross-team dependency slips',
  'High employee turnover in the packaging department',
  'Escaped defects reaching customers despite in-process checks',
]

type BusyAction =
  | 'analyze'
  | 'regenerate-ishikawa'
  | 'generate-five-why'
  | 'regenerate-five-why'
  | 'finalize'
  | null

type SaveToast = 'saving' | 'saved' | 'error' | null

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong while contacting the API.'
}

/** Small floating toast shown after auto-save */
function SaveToast({ state }: { state: SaveToast }) {
  if (!state) return null
  const configs = {
    saving: { bg: '#f9fafb', border: '#e5e7eb', color: '#374151', icon: <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />, text: 'Saving to history…' },
    saved: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', icon: <CheckCircle2 size={13} />, text: 'Saved to history' },
    error: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', icon: <AlertCircle size={13} />, text: 'Save failed — check console' },
  } as const
  const c = configs[state]
  return (
    <div style={{
      position: 'fixed', bottom: 88, right: 24, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 7,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 8, padding: '8px 14px',
      fontSize: 12, fontWeight: 600, color: c.color,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      transition: 'opacity 0.2s',
    }}>
      {c.icon} {c.text}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ChatbotFloating() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-4 text-white shadow-lg transition hover:bg-orange-700"
        onClick={() => setOpen(true)}
        aria-label="Open Chatbot"
      >
        <MessageCircle className="size-6" />
        <span className="hidden font-semibold md:inline">Chatbot</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 md:items-center">
          <div className="relative m-4 w-full max-w-md md:m-12 md:max-w-xl" onClick={e => e.stopPropagation()}>
            <Chatbot />
            <button
              className="absolute top-3 right-3 z-[60] rounded-full bg-accent p-2 text-white shadow transition hover:bg-orange-700"
              onClick={() => setOpen(false)}
              aria-label="Close Chatbot"
            >✕</button>
          </div>
        </div>
      )}
    </>
  )
}

export default function Home() {
  const router = useRouter()

  const [problem, setProblem] = useState('')
  const [domain, setDomain] = useState('Manufacturing')
  const [pastRecord, setPastRecord] = useState(String(CURRENT_YEAR))
  const [ishikawaData, setIshikawaData] = useState<IshikawaCategory[] | null>(null)
  const [fiveWhyData, setFiveWhyData] = useState<FiveWhyChainItem[] | null>(null)
  const [mainCause, setMainCause] = useState<string[] | undefined>(undefined)
  const [finalSummary, setFinalSummary] = useState<Record<string, unknown> | null>(null)
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [activeTab, setActiveTab] = useState('input')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saveToast, setSaveToast] = useState<SaveToast>(null)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  const isBusy = busyAction !== null
  const apiBaseUrl = useMemo(() => getRootCauseApiBaseUrl(), [])

  // ── Auto-save helper — uses problem statement as session title, no modal ──
  const autoSave = useCallback(async (ishikawa: IshikawaCategory[], fiveWhys: FiveWhyChainItem[], query: string, mainCause?: string[]) => {
    setSaveToast('saving')
    try {
      const triplet = storeOrGetTriplet()
      const res = await historyApi.saveAnalysis({
        ...triplet,
        domain: domain.trim(),
        query,
        past_record: Number.parseInt(pastRecord, 10) || CURRENT_YEAR,
        session_title: query.trim().slice(0, 120), // problem statement IS the title
        ishikawa,
        analysis: fiveWhys,
        main_cause: mainCause,
      })
      if (res.success) {
        setSaveToast('saved')
        setHistoryRefreshKey(prev => prev + 1)
      } else {
        setSaveToast('error')
      }
    } catch (err) {
      console.error('Auto-save failed:', err)
      setSaveToast('error')
    } finally {
      setTimeout(() => setSaveToast(null), 2800)
    }
  }, [domain, pastRecord])

  // Load session injected from history page
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('te_load_session')
      if (raw) {
        sessionStorage.removeItem('te_load_session')
        const s = JSON.parse(raw) as { query: string; domain: string; ishikawa: IshikawaCategory[]; fiveWhys: FiveWhyChainItem[]; main_cause?: string[] }
        setProblem(s.query)
        setDomain(s.domain)
        setIshikawaData(normalizeIshikawaCategories(s.ishikawa))
        setFiveWhyData(normalizeFiveWhyAnalysis(s.fiveWhys))
        setMainCause(s.main_cause)
        setFinalSummary(null)
        setActiveTab('ishikawa')
      }
    } catch { /* ignore */ }
  }, [])

  // Elapsed timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (busyAction) {
      setElapsedSeconds(0)
      elapsedRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    } else {
      if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null }
      setElapsedSeconds(0)
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current) }
  }, [busyAction])

  const statusLabel = useMemo(() => {
    switch (busyAction) {
      case 'analyze': return 'Generating Ishikawa diagram'
      case 'regenerate-ishikawa': return 'Refreshing unlocked Ishikawa causes'
      case 'generate-five-why': return 'Generating 5-Why analysis'
      case 'regenerate-five-why': return 'Refreshing unlocked 5-Why chains'
      case 'finalize': return 'Finalizing summary'
      default: return null
    }
  }, [busyAction])

  const requestPayload = useMemo(() => ({
    domain: domain.trim(),
    query: problem.trim(),
    past_record: Number.parseInt(pastRecord, 10) || CURRENT_YEAR,
  }), [domain, pastRecord, problem])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!requestPayload.query) return
    setBusyAction('analyze')
    setErrorMessage(null)
    setFiveWhyData(null)
    setFinalSummary(null)
    try {
      const res = await rootCauseApi.generateProblem(requestPayload)
      const normalizedIshikawa = normalizeIshikawaCategories(res.ishikawa)
      setIshikawaData(normalizedIshikawa)
      
      // Pick top 3 causes sorted by severity (Critical > High > Medium > Low)
      const severityRank: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }
      const defaultCauses = normalizedIshikawa
        .flatMap(cat => cat.result)
        .filter(item => item.cause?.trim())
        .sort((a, b) => (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0))
        .slice(0, 3)
        .map(item => item.cause.trim())
      
      setMainCause(defaultCauses)
      startTransition(() => setActiveTab('ishikawa'))
    } catch (err) { setErrorMessage(getErrorMessage(err)) }
    finally { setBusyAction(null) }
  }

  const handleIshikawaRegenerate = async (lockedData: IshikawaCategory[]) => {
    if (!requestPayload.query) return
    setBusyAction('regenerate-ishikawa')
    setErrorMessage(null)
    setFiveWhyData(null)
    setFinalSummary(null)
    try {
      const res = await rootCauseApi.regenerateIshikawa({ ...requestPayload, locked_result: lockedData })
      const normalizedIshikawa = normalizeIshikawaCategories(res.ishikawa)
      setIshikawaData(normalizedIshikawa)
      
      // Pick top 3 causes sorted by severity (Critical > High > Medium > Low)
      const severityRank: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }
      const defaultCauses = normalizedIshikawa
        .flatMap(cat => cat.result)
        .filter(item => item.cause?.trim())
        .sort((a, b) => (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0))
        .slice(0, 3)
        .map(item => item.cause.trim())
      
      setMainCause(defaultCauses)
    } catch (err) { setErrorMessage(getErrorMessage(err)) }
    finally { setBusyAction(null) }
  }

  /**
   * "Finalize Ishikawa" → generates 5-Why only. No save here.
   * Save happens at the last stage (Finalize Analysis).
   */
  const handleIshikawaFinalize = async (fullData: IshikawaCategory[]) => {
    setBusyAction('generate-five-why')
    setErrorMessage(null)
    // Store the full dataset in state
    const normalizedFull = normalizeIshikawaCategories(fullData)
    setIshikawaData(normalizedFull)
    setFinalSummary(null)
    try {
      // 5-Why API receives only high/critical severity causes (immediate_action = true)
      // so the LLM focuses on the most impactful root causes
      const filteredForFiveWhy = fullData.map(cat => ({
        ...cat,
        result: cat.result.filter(item => item.immediate_action),
      }))
      const res = await rootCauseApi.generateFiveWhy({ ...requestPayload, ishikawa: filteredForFiveWhy, main_cause: mainCause })
      const normalized5Why = normalizeFiveWhyAnalysis(res.analysis)
      setFiveWhyData(normalized5Why)
      startTransition(() => setActiveTab('five-why'))
      // ── No auto-save here. Save is triggered only on Finalize Analysis. ──
    } catch (err) { setErrorMessage(getErrorMessage(err)) }
    finally { setBusyAction(null) }
  }

  const handleFiveWhyRegenerate = async (lockedAnalysis: FiveWhyChainItem[]) => {
    if (!ishikawaData) return
    setBusyAction('regenerate-five-why')
    setErrorMessage(null)
    setFinalSummary(null)
    try {
      const res = await rootCauseApi.regenerateFiveWhy({ ...requestPayload, ishikawa: ishikawaData, locked_analysis: lockedAnalysis })
      setFiveWhyData(normalizeFiveWhyAnalysis(res.analysis))
    } catch (err) { setErrorMessage(getErrorMessage(err)) }
    finally { setBusyAction(null) }
  }

  /**
   * "Finalize Analysis" (5-Why) → the ONLY point where a save is triggered.
   * Generates the final summary, then auto-saves the full session silently.
   */
  const handleFiveWhyFinalize = async (analysis: FiveWhyChainItem[]) => {
    if (!ishikawaData) return
    setBusyAction('finalize')
    setErrorMessage(null)
    const normalized5Why = normalizeFiveWhyAnalysis(analysis)
    setFiveWhyData(normalized5Why)
    try {
      const res = await rootCauseApi.finalizeAnalysis({
        domain: requestPayload.domain,
        query: requestPayload.query,
        ishikawa: ishikawaData,
        analysis,
      })
      setFinalSummary(res.summary ?? {})
      // ── Only save point: triggered after the complete workflow is done ──
      void autoSave(ishikawaData, normalized5Why, requestPayload.query)
    } catch (err) { setErrorMessage(getErrorMessage(err)) }
    finally { setBusyAction(null) }
  }

  // History sidebar load
  const handleHistoryLoad = (session: { query: string; domain: string; ishikawa: IshikawaCategory[]; fiveWhys: FiveWhyChainItem[]; main_cause?: string[] }) => {
    setProblem(session.query)
    setDomain(session.domain)
    setIshikawaData(normalizeIshikawaCategories(session.ishikawa))
    setFiveWhyData(normalizeFiveWhyAnalysis(session.fiveWhys))
    setMainCause(session.main_cause)
    setFinalSummary(null)
    setErrorMessage(null)
    setActiveTab('ishikawa')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden', background: '#fdfdfd' }}>

      {/* ── Left History Sidebar ── */}
      <HistorySidebar onLoad={handleHistoryLoad} refreshTrigger={historyRefreshKey} />

      {/* ── Main Content ── */}
      <div
        style={{
          flex: 1,
          height: '100vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Header Navigation */}
        <header style={{
          height: 64, borderBottom: '1px solid #f1f5f9', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px', position: 'sticky', top: 0, zIndex: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              width: 32, height: 32, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={18} color="#fff" strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              TE <span style={{ color: '#f97316' }}>RootCause</span>
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button variant="ghost" size="sm" onClick={() => router.push('/history')} className="gap-2 text-slate-600 font-semibold hover:bg-slate-50">
              <History size={16} /> Repository
            </Button>
            <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-2 text-slate-600 font-semibold border-slate-200">
              <RefreshCw size={14} /> New Session
            </Button>
          </div>
        </header>

        <main style={{ flex: 1, padding: '40px 32px 80px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>

            {/* Hero Section */}
            {activeTab === 'input' && (
              <div style={{ textAlign: 'center', marginBottom: 48, animation: 'fadeInDown 0.6s ease' }}>
                <Badge variant="outline" className="mb-4 px-3 py-1 bg-orange-50 text-orange-700 border-orange-200 font-bold uppercase tracking-wider text-[10px]">
                  Powered by Advanced Reasoning
                </Badge>
                <h2 style={{ fontSize: 42, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 16 }}>
                  Identify the <span style={{ color: '#f97316' }}>True Cause</span> of Every Problem
                </h2>
                <p style={{ fontSize: 18, color: '#64748b', maxWidth: 600, margin: '0 auto', lineHeight: 1.6, fontWeight: 500 }}>
                  A sophisticated diagnostic suite combining Ishikawa mapping with iterative 5-Why discovery to prevent recurrences.
                </p>

                {/* Status Bar */}
                {statusLabel && (
                  <div style={{
                    maxWidth: 600, margin: '24px auto 0', padding: '12px 20px',
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}>
                    <Loader2 size={16} className="animate-spin text-orange-500" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>
                      {statusLabel}
                      {elapsedSeconds > 5 && ` (${elapsedSeconds}s)`}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
                <TabsList className="bg-slate-100 p-1 rounded-xl h-12 border border-slate-200">
                  <TabsTrigger value="input" className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm">
                    Input
                  </TabsTrigger>
                  <TabsTrigger value="ishikawa" disabled={!ishikawaData?.length} className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm">
                    Ishikawa
                  </TabsTrigger>
                  <TabsTrigger value="five-why" disabled={!fiveWhyData?.length} className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm">
                    5-Why
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Step 1: Input */}
              <TabsContent value="input" className="animation-fadeIn">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
                  <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                    <div style={{ padding: '32px' }}>
                      <div className="space-y-8">
                        <div>
                          <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            PROBLEM STATEMENT
                          </label>
                          <Textarea
                            placeholder="Describe the failure mode, defect, or inefficiency in detail..."
                            value={problem}
                            onChange={(e) => setProblem(e.target.value)}
                            className="min-h-[120px] resize-none text-lg border-slate-200 focus:border-orange-500 focus:ring-orange-200 rounded-xl bg-slate-50/50"
                            disabled={isBusy}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                              DOMAIN / MODULE
                            </label>
                            <Input
                              placeholder="e.g., Manufacturing"
                              value={domain}
                              onChange={(e) => setDomain(e.target.value)}
                              className="h-12 border-slate-200 focus:border-orange-500 focus:ring-orange-200 rounded-xl"
                              disabled={isBusy}
                            />
                          </div>
                          {/* <div>
                            <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                              REFERENCE YEAR
                            </label>
                            <Input
                              placeholder={String(CURRENT_YEAR)}
                              value={pastRecord}
                              onChange={(e) => setPastRecord(e.target.value)}
                              className="h-12 border-slate-200 focus:border-orange-500 focus:ring-orange-200 rounded-xl"
                              disabled={isBusy}
                            />
                          </div> */}
                        </div>

                        {errorMessage && (
                          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900 rounded-xl">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="font-bold">Error Detected</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                          </Alert>
                        )}

                        <Button
                          size="lg"
                          className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-lg font-bold shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
                          onClick={handleAnalyze}
                          disabled={!problem.trim() || isBusy}
                        >
                          {busyAction === 'analyze' ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Analyzing Problem...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-5 w-5" />
                              Generate Root Cause Map
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Examples Card */}
                  <Card className="border-slate-200 shadow-sm rounded-2xl p-6 bg-slate-50/30">
                    <h3 style={{ fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                      Quick Examples
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                      {EXAMPLES.map(example => (
                        <button
                          key={example}
                          onClick={() => setProblem(example)}
                          style={{
                            padding: '12px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
                            fontSize: 13, color: '#475569', fontWeight: 600, textAlign: 'left',
                            cursor: 'pointer', transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#f97316'; (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
                          disabled={isBusy}
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* Step 2: Ishikawa */}
              <TabsContent value="ishikawa" className="animation-fadeIn">
                {ishikawaData && (
                  <div className="space-y-8">
                    <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl p-8 bg-white">
                      <IshikawaDiagram
                        problem={problem}
                        data={ishikawaData}
                        mainCause={mainCause}
                        onMainCauseChange={setMainCause}
                        busy={isBusy}
                        onRegenerate={handleIshikawaRegenerate}
                        onFinalize={handleIshikawaFinalize}
                      />
                    </Card>
                    <div style={{ textAlign: 'center' }}>
                      <IshikawaImageRequest problem={problem} data={ishikawaData} mainCause={mainCause} />
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Step 3: 5-Why */}
              <TabsContent value="five-why" className="animation-fadeIn">
                {fiveWhyData && (
                  <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl p-8 bg-white">
                    <FiveWhyAnalysis
                      problem={problem}
                      data={fiveWhyData}
                      summary={finalSummary}
                      busy={isBusy}
                      onRegenerate={handleFiveWhyRegenerate}
                      onFinalize={handleFiveWhyFinalize}
                    />
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <ChatbotFloating />

        {/* Save Toast */}
        {saveToast && (
          <div style={{
            position: 'fixed', bottom: 32, right: 32, zIndex: 100,
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <div style={{
              background: '#0f172a', color: '#fff', padding: '12px 20px',
              borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {saveToast === 'saving' && <Loader2 className="animate-spin size-4 text-orange-400" />}
              {saveToast === 'saved' && <CheckCircle2 className="size-4 text-green-400" />}
              {saveToast === 'error' && <AlertCircle className="size-4 text-red-400" />}
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {saveToast === 'saving' ? 'Synching to cloud...' :
                  saveToast === 'saved' ? 'Analysis secured in history' :
                    'Network error during save'}
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animation-fadeIn {
          animation: fadeIn 0.4s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

