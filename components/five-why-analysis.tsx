'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Lock, RefreshCw, Unlock, Download, ImageIcon, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { type FiveWhyChainItem, normalizeFiveWhyAnalysis } from '@/lib/root-cause'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

function clampConfidence(value: string) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.min(1, Math.max(0, parsed))
}

function hasMeaningfulChain(item: FiveWhyChainItem) {
  return Boolean(
    item.root_cause.trim() ||
      item.why_chain.some((step) => step.question.trim() || step.answer.trim()),
  )
}

function renderSummaryValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return 'Not provided'
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return JSON.stringify(value, null, 2)
}

export function FiveWhyAnalysis({
  problem,
  data,
  summary,
  busy = false,
  onFinalize,
  onRegenerate,
}: {
  problem: string
  data: FiveWhyChainItem[]
  summary?: Record<string, unknown> | null
  busy?: boolean
  onFinalize?: (analysis: FiveWhyChainItem[]) => void | Promise<void>
  onRegenerate?: (lockedAnalysis: FiveWhyChainItem[]) => void | Promise<void>
}) {
  const normalizedData = useMemo(() => normalizeFiveWhyAnalysis(data), [data])

  const [locked, setLocked] = useState(false)
  const [draftAnalysis, setDraftAnalysis] = useState<FiveWhyChainItem[]>(normalizedData)
  const [lockedRows, setLockedRows] = useState<boolean[]>(() =>
    normalizedData.map(() => false),
  )

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  const lockedRowsRef = useRef(lockedRows)
  useEffect(() => {
    lockedRowsRef.current = lockedRows
  }, [lockedRows])

  useEffect(() => {
    setDraftAnalysis((previous) =>
      normalizedData.map((item, index) =>
        lockedRowsRef.current[index] ? previous[index] ?? item : item,
      ),
    )
    setLockedRows((previous) => normalizedData.map((_, index) => previous[index] ?? false))
  }, [normalizedData])

  const serializeAnalysis = (onlyLocked: boolean) =>
    draftAnalysis.filter(
      (item, index) => (!onlyLocked || lockedRows[index]) && hasMeaningfulChain(item),
    )

  const handleRootCauseChange = (rowIndex: number, value: string) => {
    setDraftAnalysis((previous) =>
      previous.map((item, currentIndex) =>
        currentIndex === rowIndex
          ? {
              ...item,
              root_cause: value,
            }
          : item,
      ),
    )
  }

  const handleConfidenceChange = (rowIndex: number, value: string) => {
    setDraftAnalysis((previous) =>
      previous.map((item, currentIndex) =>
        currentIndex === rowIndex
          ? {
              ...item,
              confidence: clampConfidence(value),
            }
          : item,
      ),
    )
  }

  const handleStepChange = (
    rowIndex: number,
    stepIndex: number,
    field: 'question' | 'answer',
    value: string,
  ) => {
    setDraftAnalysis((previous) =>
      previous.map((item, currentIndex) =>
        currentIndex === rowIndex
          ? {
              ...item,
              why_chain: item.why_chain.map((step, currentStepIndex) =>
                currentStepIndex === stepIndex
                  ? {
                      ...step,
                      [field]: value,
                    }
                  : step,
              ),
            }
          : item,
      ),
    )
  }

  const toggleRowLock = (rowIndex: number) => {
    setLockedRows((previous) =>
      previous.map((isLocked, currentIndex) =>
        currentIndex === rowIndex ? !isLocked : isLocked,
      ),
    )
  }

  const handleRegenerate = async () => {
    await onRegenerate?.(serializeAnalysis(true))
  }

  const handleFinalize = async () => {
    const finalAnalysis = serializeAnalysis(false)
    setLocked(true)
    await onFinalize?.(finalAnalysis)
  }

  const handleExport = () => {
    const exportData = {
      problem,
      analysis: serializeAnalysis(false),
      summary: summary ?? {},
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'five-why-analysis.json'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const handleDownloadImage = () => {
    if (!imageSrc) return
    const link = document.createElement('a')
    link.href = imageSrc
    link.download = 'five-why-analysis.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleGenerateImage = async () => {
    setImageLoading(true)
    setImageError(null)

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

    try {
      const response = await fetch(`${API_BASE_URL}/generate-five-why`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          problem,
          analysis: serializeAnalysis(false),
          summary: summary ?? {},
        }),
      })
      if (!response.ok) throw new Error(`Server error: ${response.statusText}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setImageSrc(url)
    } catch (error) {
      console.error('Error generating image:', error)
      setImageError(error instanceof Error ? error.message : 'Failed to generate image')
    } finally {
      setImageLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="gap-4 border-border px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">5-Why Analysis</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Each card represents a candidate root-cause chain generated from the finalized
              Ishikawa diagram.
            </p>
          </div>
          {locked ? (
            <Button variant="secondary" onClick={() => setLocked(false)} disabled={busy}>
              Unlock for Editing
            </Button>
          ) : null}
        </div>
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Problem</p>
          <p className="mt-1 text-sm font-medium text-foreground">{problem}</p>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {draftAnalysis.map((item, rowIndex) => {
          const isRowLocked = lockedRows[rowIndex]

          return (
            <Card
              key={`${item.problem_id}-${rowIndex}`}
              className="gap-4 border-border px-6 py-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Potential Cause {rowIndex + 1}</Badge>
                    {item.problem_id ? <Badge variant="secondary">{item.problem_id}</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Lock this card if you want regeneration to preserve it.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => toggleRowLock(rowIndex)}
                  aria-label={isRowLocked ? 'Unlock this chain' : 'Lock this chain'}
                  disabled={busy}
                >
                  {isRowLocked ? (
                    <Lock className="size-4 text-blue-600" />
                  ) : (
                    <Unlock className="size-4 text-slate-400" />
                  )}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <Textarea
                  value={item.root_cause}
                  onChange={(event) => handleRootCauseChange(rowIndex, event.target.value)}
                  placeholder="Root cause"
                  aria-label={`Root cause ${rowIndex + 1}`}
                  disabled={locked || isRowLocked || busy}
                  className="min-h-20 resize-y bg-white"
                />
                <div className="space-y-2">
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={String(item.confidence)}
                    onChange={(event) => handleConfidenceChange(rowIndex, event.target.value)}
                    placeholder="0.00"
                    aria-label={`Confidence ${rowIndex + 1}`}
                    disabled={locked || isRowLocked || busy}
                    className="bg-white"
                  />
                  <Badge variant="outline" className="w-full justify-center">
                    Confidence {Math.round(item.confidence * 100)}%
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                {item.why_chain.map((step, stepIndex) => (
                  <div
                    key={`${item.problem_id}-${step.level}`}
                    className="rounded-lg border border-border bg-muted/10 p-3"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="secondary">Why {step.level}</Badge>
                    </div>
                    <div className="grid gap-3">
                      <Textarea
                        value={step.question}
                        onChange={(event) =>
                          handleStepChange(rowIndex, stepIndex, 'question', event.target.value)
                        }
                        placeholder={`Question for Why ${step.level}`}
                        aria-label={`Why ${step.level} question`}
                        disabled={locked || isRowLocked || busy}
                        className="min-h-16 resize-y bg-white"
                      />
                      <Textarea
                        value={step.answer}
                        onChange={(event) =>
                          handleStepChange(rowIndex, stepIndex, 'answer', event.target.value)
                        }
                        placeholder={`Answer for Why ${step.level}`}
                        aria-label={`Why ${step.level} answer`}
                        disabled={locked || isRowLocked || busy}
                        className="min-h-16 resize-y bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        {onRegenerate ? (
          <Button type="button" variant="secondary" onClick={handleRegenerate} disabled={busy}>
            <RefreshCw className="size-4" />
            Regenerate Unlocked Chains
          </Button>
        ) : null}
        {!locked ? (
          <Button type="button" onClick={handleFinalize} disabled={busy}>
            Finalize Analysis
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={handleExport} disabled={busy}>
          Export
        </Button>
        <Button type="button" variant="outline" onClick={handleGenerateImage} disabled={busy || imageLoading}>
          {imageLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-4 w-4" />
              Render PNG
            </>
          )}
        </Button>
      </div>

      {summary && Object.keys(summary).length > 0 ? (
        <Card className="gap-4 border-border px-6 py-5">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">Final Summary</h3>
            <p className="text-sm text-muted-foreground">
              This section reflects the response returned by the finalize endpoint.
            </p>
          </div>
          <div className="grid gap-3">
            {Object.entries(summary).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-border bg-muted/15 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  {key.replace(/_/g, ' ')}
                </p>
                {typeof value === 'object' && value !== null ? (
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-sm text-foreground">
                    {renderSummaryValue(value)}
                  </pre>
                ) : (
                  <p className="mt-2 text-sm text-foreground">{renderSummaryValue(value)}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="p-6 border-border bg-card/50">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Generate Visual Diagram</h3>
              <p className="text-sm text-muted-foreground">
                Send the current data to the local server (Port 4000) to render a PNG image.
              </p>
            </div>
            <Button onClick={handleGenerateImage} disabled={busy || imageLoading}>
              {imageLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Render PNG
                </>
              )}
            </Button>
          </div>

          {imageError && (
            <div className="p-3 text-sm text-red-500 bg-red-100/50 rounded-lg border border-red-200">
              {imageError}
            </div>
          )}

          {imageSrc && (
            <div className="relative mt-4 group">
              <div className="overflow-hidden rounded-lg border border-border bg-white shadow-inner">
                <img src={imageSrc} alt="5-Why Analysis Diagram" className="w-full h-auto" />
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="secondary" onClick={handleDownloadImage}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PNG
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
