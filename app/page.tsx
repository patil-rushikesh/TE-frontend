'use client'

import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, FileText, Loader2, MessageCircle, Sparkles } from 'lucide-react'

import Chatbot from '@/components/chatbot'
import EightDManager from '@/components/eightd-manager'
import { FiveWhyAnalysis } from '@/components/five-why-analysis'
import { IshikawaDiagram } from '@/components/ishikawa-diagram'
import { IshikawaImageRequest } from '@/components/ishikawa-image-request'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong while contacting the API.'
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
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 md:items-center">
          <div
            className="relative m-4 w-full max-w-md md:m-12 md:max-w-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Chatbot />
            <button
              className="absolute top-3 right-3 z-[60] rounded-full bg-accent p-2 text-white shadow transition hover:bg-orange-700"
              onClick={() => setOpen(false)}
              aria-label="Close Chatbot"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default function Home() {
  const [problem, setProblem] = useState('')
  const [domain, setDomain] = useState('Manufacturing')
  const [pastRecord, setPastRecord] = useState(String(CURRENT_YEAR))
  const [ishikawaData, setIshikawaData] = useState<IshikawaCategory[] | null>(null)
  const [fiveWhyData, setFiveWhyData] = useState<FiveWhyChainItem[] | null>(null)
  const [finalSummary, setFinalSummary] = useState<Record<string, unknown> | null>(null)
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [activeTab, setActiveTab] = useState('input')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isBusy = busyAction !== null
  const apiBaseUrl = useMemo(() => getRootCauseApiBaseUrl(), [])

  // Track elapsed seconds during busy operations so users know it's still running
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (busyAction) {
      setElapsedSeconds(0)
      elapsedRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    } else {
      if (elapsedRef.current) {
        clearInterval(elapsedRef.current)
        elapsedRef.current = null
      }
      setElapsedSeconds(0)
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [busyAction])

  const statusLabel = useMemo(() => {
    switch (busyAction) {
      case 'analyze':
        return 'Generating Ishikawa diagram'
      case 'regenerate-ishikawa':
        return 'Refreshing unlocked Ishikawa causes'
      case 'generate-five-why':
        return 'Generating 5-Why analysis'
      case 'regenerate-five-why':
        return 'Refreshing unlocked 5-Why chains'
      case 'finalize':
        return 'Finalizing summary'
      default:
        return null
    }
  }, [busyAction])

  const requestPayload = useMemo(
    () => ({
      domain: domain.trim(),
      query: problem.trim(),
      past_record: Number.parseInt(pastRecord, 10) || CURRENT_YEAR,
    }),
    [domain, pastRecord, problem],
  )

  const handleAnalyze = async () => {
    if (!requestPayload.query) {
      return
    }

    setBusyAction('analyze')
    setErrorMessage(null)
    setFiveWhyData(null)
    setFinalSummary(null)

    try {
      const response = await rootCauseApi.generateProblem(requestPayload)
      setIshikawaData(normalizeIshikawaCategories(response.ishikawa))
      startTransition(() => setActiveTab('ishikawa'))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  const handleIshikawaRegenerate = async (lockedData: IshikawaCategory[]) => {
    if (!requestPayload.query) {
      return
    }

    setBusyAction('regenerate-ishikawa')
    setErrorMessage(null)
    setFiveWhyData(null)
    setFinalSummary(null)

    try {
      const response = await rootCauseApi.regenerateIshikawa({
        ...requestPayload,
        locked_result: lockedData,
      })
      setIshikawaData(normalizeIshikawaCategories(response.ishikawa))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  const handleIshikawaFinalize = async (finalData: IshikawaCategory[]) => {
    setBusyAction('generate-five-why')
    setErrorMessage(null)
    setIshikawaData(normalizeIshikawaCategories(finalData))
    setFinalSummary(null)

    try {
      const response = await rootCauseApi.generateFiveWhy({
        ...requestPayload,
        ishikawa: finalData,
      })
      setFiveWhyData(normalizeFiveWhyAnalysis(response.analysis))
      startTransition(() => setActiveTab('five-why'))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  const handleFiveWhyRegenerate = async (lockedAnalysis: FiveWhyChainItem[]) => {
    if (!ishikawaData) {
      return
    }

    setBusyAction('regenerate-five-why')
    setErrorMessage(null)
    setFinalSummary(null)

    try {
      const response = await rootCauseApi.regenerateFiveWhy({
        ...requestPayload,
        ishikawa: ishikawaData,
        locked_analysis: lockedAnalysis,
      })
      setFiveWhyData(normalizeFiveWhyAnalysis(response.analysis))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  const handleFiveWhyFinalize = async (analysis: FiveWhyChainItem[]) => {
    if (!ishikawaData) {
      return
    }

    setBusyAction('finalize')
    setErrorMessage(null)
    setFiveWhyData(normalizeFiveWhyAnalysis(analysis))

    try {
      const response = await rootCauseApi.finalizeAnalysis({
        domain: requestPayload.domain,
        query: requestPayload.query,
        ishikawa: ishikawaData,
        analysis,
      })
      setFinalSummary(response.summary ?? {})
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,136,0,0.16),_transparent_30%),linear-gradient(135deg,_rgba(255,229,180,0.35),_transparent_42%),linear-gradient(180deg,_var(--background),_rgba(245,245,245,0.9))] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/95 shadow-sm backdrop-blur">
          <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.25fr_0.75fr] md:px-10 md:py-10">
            <div className="space-y-5">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                AI Root Cause Workflow
              </Badge>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                  Turn one problem statement into an Ishikawa, a 5-Why chain, and a final
                  action summary.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                  The frontend is now wired to your FastAPI workflow, so the UI updates directly
                  from `/problem`, `/regenerate`, `/gen-five-why`, `/regenerate-five-why`, and
                  `/finalize`.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="rounded-full border border-border bg-muted/30 px-3 py-1">
                  Editable mapped causes
                </span>
                <span className="rounded-full border border-border bg-muted/30 px-3 py-1">
                  Lock-aware regeneration
                </span>
                <span className="rounded-full border border-border bg-muted/30 px-3 py-1">
                  Final summary rendering
                </span>
              </div>
            </div>

            <Card className="gap-4 border-border bg-white/80 px-6 py-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Connection Status</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Configure `NEXT_PUBLIC_API_BASE_URL` if your backend is not running on the
                  default host.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Active API base
                </p>
                <p className="mt-2 break-all text-sm font-medium text-foreground">{apiBaseUrl}</p>
              </div>
              {statusLabel ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span>
                    {statusLabel}
                    {elapsedSeconds > 5 ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({elapsedSeconds}s — LLM inference can take several minutes)
                      </span>
                    ) : null}
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  Ready for a new analysis run.
                </div>
              )}
            </Card>
          </div>
        </section>

        {errorMessage ? (
          <Alert variant="destructive" className="border-destructive/40">
            <AlertCircle className="size-4" />
            <AlertTitle>Request failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-card p-2 md:grid-cols-4">
            <TabsTrigger value="input" className="rounded-xl">
              Input
            </TabsTrigger>
            <TabsTrigger value="ishikawa" disabled={!ishikawaData?.length} className="rounded-xl">
              Ishikawa
            </TabsTrigger>
            <TabsTrigger value="five-why" disabled={!fiveWhyData?.length} className="rounded-xl">
              5 Why
            </TabsTrigger>
            <TabsTrigger value="eightd" className="rounded-xl">
              <FileText className="mr-1 inline size-4" />
              8D Docs
            </TabsTrigger>
          </TabsList>

          <ChatbotFloating />

          <TabsContent value="input" className="mt-6 space-y-6">
            <Card className="gap-5 border-border px-6 py-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">Describe Your Problem</h2>
                <p className="text-sm text-muted-foreground">
                  Provide the problem statement and the context your backend expects for the
                  analysis request.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="domain" className="text-sm font-medium text-foreground">
                    Domain
                  </label>
                  <Input
                    id="domain"
                    value={domain}
                    onChange={(event) => setDomain(event.target.value)}
                    placeholder="Manufacturing"
                    disabled={isBusy}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="past-record" className="text-sm font-medium text-foreground">
                    Historical Reference Year
                  </label>
                  <Input
                    id="past-record"
                    type="number"
                    min={1900}
                    max={CURRENT_YEAR}
                    value={pastRecord}
                    onChange={(event) => setPastRecord(event.target.value)}
                    placeholder={String(CURRENT_YEAR)}
                    disabled={isBusy}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="problem" className="text-sm font-medium text-foreground">
                  Problem Statement
                </label>
                <Textarea
                  id="problem"
                  value={problem}
                  onChange={(event) => setProblem(event.target.value)}
                  placeholder="Describe the failure, symptom, or recurring issue you want to investigate..."
                  className="min-h-32 resize-y"
                  disabled={isBusy}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                      void handleAnalyze()
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Press `Ctrl/Cmd + Enter` to submit quickly.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  Step 1 of 3: Generate Ishikawa
                </Badge>
                <Button onClick={handleAnalyze} disabled={!problem.trim() || isBusy} size="lg">
                  {busyAction === 'analyze' ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Problem'
                  )}
                </Button>
              </div>
            </Card>

            <Card className="gap-4 border-border px-6 py-6">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Quick Examples
                </h3>
                <p className="text-sm text-muted-foreground">
                  Use one of these to test the API wiring and the downstream tabs.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    onClick={() => setProblem(example)}
                    className="rounded-xl border border-border bg-white px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-muted/40"
                    disabled={isBusy}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ishikawa" className="mt-6">
            {ishikawaData ? (
              <>
                <IshikawaDiagram
                  problem={problem}
                  data={ishikawaData}
                  busy={isBusy}
                  onRegenerate={handleIshikawaRegenerate}
                  onFinalize={handleIshikawaFinalize}
                />
                <IshikawaImageRequest problem={problem} data={ishikawaData} />
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="five-why" className="mt-6">
            {fiveWhyData ? (
              <FiveWhyAnalysis
                problem={problem}
                data={fiveWhyData}
                summary={finalSummary}
                busy={isBusy}
                onRegenerate={handleFiveWhyRegenerate}
                onFinalize={handleFiveWhyFinalize}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="eightd" className="mt-6">
            <EightDManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
