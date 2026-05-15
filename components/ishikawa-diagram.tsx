'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Lock, RefreshCw, Unlock } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  type CauseStatus,
  type IshikawaCategory,
  type IshikawaResultItem,
  CANONICAL_BONES,
  createEmptyIshikawaItem,
  isMeaningfulIshikawaItem,
  normalizeIshikawaCategories,
} from '@/lib/root-cause'

type EditableIshikawaItem = IshikawaResultItem & {
  status: CauseStatus
}

const STATUS_OPTIONS: Array<{
  label: string
  value: CauseStatus
  className: string
}> = [
    { label: 'Confirmed as Cause', value: 'confirmed', className: 'text-red-600' },
    { label: 'Possible Cause', value: 'possible', className: 'text-orange-600' },
    { label: 'Excluded as Cause', value: 'excluded', className: 'text-green-600' },
    { label: 'N/A', value: 'na', className: 'text-slate-700' },
  ]

const TABLE_GROUPS = [CANONICAL_BONES.slice(0, 3), CANONICAL_BONES.slice(3)]

function createEditableItem(item?: IshikawaResultItem): EditableIshikawaItem {
  return {
    ...(item ?? createEmptyIshikawaItem()),
    status: 'possible',
  }
}

function cloneEditableItem(item: EditableIshikawaItem) {
  return {
    ...item,
  }
}

function buildMatrix(categories: IshikawaCategory[], rowCount: number) {
  return categories.map((category) =>
    Array.from({ length: rowCount }, (_, rowIndex) =>
      createEditableItem(category.result[rowIndex]),
    ),
  )
}

function buildLockedMatrix(previous: boolean[][], categoryCount: number, rowCount: number) {
  return Array.from({ length: categoryCount }, (_, categoryIndex) =>
    Array.from({ length: rowCount }, (_, rowIndex) => previous[categoryIndex]?.[rowIndex] ?? false),
  )
}

function getEvidenceTone(severity: string) {
  const normalized = severity.trim().toLowerCase()

  if (normalized.includes('high') || normalized.includes('critical')) {
    return 'destructive' as const
  }
  if (normalized.includes('medium')) {
    return 'secondary' as const
  }

  return 'outline' as const
}

export function IshikawaDiagram({
  problem,
  data,
  mainCause,
  onMainCauseChange,
  busy = false,
  onFinalize,
  onRegenerate,
}: {
  problem: string
  data: IshikawaCategory[]
  mainCause?: string[]
  onMainCauseChange?: (val: string[]) => void
  busy?: boolean
  onFinalize?: (finalData: IshikawaCategory[]) => void | Promise<void>
  onRegenerate?: (lockedData: IshikawaCategory[]) => void | Promise<void>
}) {
  const orderedCategories = useMemo(() => normalizeIshikawaCategories(data), [data])
  const rowCount = useMemo(
    () => Math.max(3, ...orderedCategories.map((category) => category.result.length)),
    [orderedCategories],
  )

  const [locked, setLocked] = useState(false)
  const [editableCells, setEditableCells] = useState<EditableIshikawaItem[][]>(() =>
    buildMatrix(orderedCategories, rowCount),
  )
  const [lockedCells, setLockedCells] = useState<boolean[][]>(() =>
    buildLockedMatrix([], orderedCategories.length, rowCount),
  )

  const lockedCellsRef = useRef(lockedCells)
  useEffect(() => {
    lockedCellsRef.current = lockedCells
  }, [lockedCells])

  useEffect(() => {
    setEditableCells((previous) =>
      orderedCategories.map((category, categoryIndex) =>
        Array.from({ length: rowCount }, (_, rowIndex) => {
          if (lockedCellsRef.current[categoryIndex]?.[rowIndex]) {
            return previous[categoryIndex]?.[rowIndex] ?? createEditableItem()
          }

          const nextItem = category.result[rowIndex]
          const previousStatus = previous[categoryIndex]?.[rowIndex]?.status ?? 'possible'

          return {
            ...createEditableItem(nextItem),
            status: previousStatus,
          }
        }),
      ),
    )
    setLockedCells((previous) => buildLockedMatrix(previous, orderedCategories.length, rowCount))
  }, [orderedCategories, rowCount])

  const serializeCells = (onlyLocked: boolean) =>
    orderedCategories.map((category, categoryIndex) => ({
      id: category.id,
      category: category.category,
      result: editableCells[categoryIndex]
        ?.filter((item, rowIndex) => (!onlyLocked || lockedCells[categoryIndex]?.[rowIndex]) && isMeaningfulIshikawaItem(item))
        .map(({ status: _status, ...item }) => item as IshikawaResultItem) ?? [],
    }))

  const handleCellChange = (
    categoryIndex: number,
    rowIndex: number,
    field: Exclude<keyof IshikawaResultItem, 'immediate_action'> | 'status',
    value: string,
  ) => {
    setEditableCells((previous) =>
      previous.map((categoryItems, currentCategoryIndex) =>
        currentCategoryIndex === categoryIndex
          ? categoryItems.map((item, currentRowIndex) =>
            currentRowIndex === rowIndex
              ? {
                ...item,
                [field]: value,
              }
              : item,
          )
          : categoryItems.map((item) => cloneEditableItem(item)),
      ),
    )
  }

  const toggleCellLock = (categoryIndex: number, rowIndex: number) => {
    setLockedCells((previous) =>
      previous.map((rowLocks, currentCategoryIndex) =>
        currentCategoryIndex === categoryIndex
          ? rowLocks.map((isLocked, currentRowIndex) =>
            currentRowIndex === rowIndex ? !isLocked : isLocked,
          )
          : [...rowLocks],
      ),
    )
  }

  const handleFinalize = async () => {
    // Always send the complete dataset to the parent.
    // The parent decides what subset to use for 5-Why generation vs. saving to history.
    const fullData = serializeCells(false)
    setLocked(true)
    await onFinalize?.(fullData)
  }

  const handleExport = () => {
    const exportData = {
      problem,
      ishikawa: serializeCells(false),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'ishikawa-diagram.json'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const renderCell = (categoryName: string, categoryIndex: number, rowIndex: number) => {
    const item = editableCells[categoryIndex]?.[rowIndex] ?? createEditableItem()
    const isCellLocked = lockedCells[categoryIndex]?.[rowIndex]

    return (
      <td
        key={`${categoryName}-${rowIndex}`}
        className="border-t border-border bg-white px-3 py-3 align-top"
      >
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Input
              value={item.sub_category}
              onChange={(event) =>
                handleCellChange(categoryIndex, rowIndex, 'sub_category', event.target.value)
              }
              placeholder="Sub-category"
              aria-label={`${categoryName} sub-category ${rowIndex + 1}`}
              disabled={locked || isCellLocked || busy}
              className="h-8 bg-white text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              onClick={() => toggleCellLock(categoryIndex, rowIndex)}
              title={isCellLocked ? 'Unlock this cause' : 'Lock this cause'}
              aria-label={isCellLocked ? 'Unlock this cause' : 'Lock this cause'}
              disabled={busy}
            >
              {isCellLocked ? (
                <Lock className="size-4 text-blue-600" />
              ) : (
                <Unlock className="size-4 text-slate-400" />
              )}
            </Button>
          </div>
          <Textarea
            value={item.cause}
            onChange={(event) => handleCellChange(categoryIndex, rowIndex, 'cause', event.target.value)}
            placeholder="Cause description"
            aria-label={`${categoryName} cause ${rowIndex + 1}`}
            disabled={locked || isCellLocked || busy}
            className="min-h-24 resize-y bg-white text-sm"
          />
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={item.evidence}
              onChange={(event) =>
                handleCellChange(categoryIndex, rowIndex, 'evidence', event.target.value)
              }
              placeholder="Evidence"
              aria-label={`${categoryName} evidence ${rowIndex + 1}`}
              disabled={locked || isCellLocked || busy}
              className="h-8 bg-white text-xs"
            />
            <Input
              value={item.severity}
              onChange={(event) =>
                handleCellChange(categoryIndex, rowIndex, 'severity', event.target.value)
              }
              placeholder="Severity"
              aria-label={`${categoryName} severity ${rowIndex + 1}`}
              disabled={locked || isCellLocked || busy}
              className="h-8 bg-white text-xs sm:w-28"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <select
              className="h-8 w-full rounded-md border border-border bg-white px-2 text-xs"
              aria-label={`${categoryName} status ${rowIndex + 1}`}
              value={item.status}
              onChange={(event) =>
                handleCellChange(categoryIndex, rowIndex, 'status', event.target.value)
              }
              disabled={locked || busy}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className={option.className}>
                  {option.label}
                </option>
              ))}
            </select>
            {item.severity.trim() ? (
              <Badge variant={getEvidenceTone(item.severity)}>{item.severity}</Badge>
            ) : null}
            <Badge variant={item.immediate_action ? 'default' : 'outline'} className={item.immediate_action ? 'bg-green-600 text-white hover:bg-green-700' : 'text-slate-500'}>
              {item.immediate_action ? 'Include' : 'Excluded'}
            </Badge>
          </div>
        </div>
      </td>
    )
  }

  return (
    <Card className="gap-0 overflow-hidden border-border bg-card">
      <div className="border-b border-border px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Ishikawa Diagram</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Review each generated cause, lock any rows you want preserved, then finalize to
              create the 5-Why analysis.
            </p>
          </div>
          {locked ? (
            <Button variant="secondary" onClick={() => setLocked(false)} disabled={busy}>
              Unlock for Editing
            </Button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-border bg-muted/20 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">Problem Statement</Badge>
          <p className="text-sm font-medium text-foreground">{problem}</p>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {TABLE_GROUPS.map((group, tableIndex) => (
          <div key={group.join('-')}>
            {tableIndex === 1 && (
              <div className="my-6 rounded-xl border border-orange-200 bg-orange-50/50 p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-orange-800">
                  <span className="size-2 rounded-full bg-orange-500" />
                  Primary Root Causes (From History)
                </h3>
                {locked ? (
                  <ul className="space-y-2 pl-1">
                    {(mainCause || []).map((cause, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm font-medium text-slate-700">
                        <span className="mt-0.5 text-orange-500">•</span>
                        <span className="leading-relaxed">{cause}</span>
                      </li>
                    ))}
                    {(!mainCause || mainCause.length === 0) && (
                      <li className="text-sm italic text-slate-500">No primary root causes specified.</li>
                    )}
                  </ul>
                ) : (
                  <Textarea
                    placeholder="Enter main causes here, separated by the | symbol (e.g. Cause A | Cause B)..."
                    value={(mainCause || []).join(' | ')}
                    onChange={(e) => onMainCauseChange?.(e.target.value.split('|').map(s => s.trim()).filter(Boolean))}
                    className="min-h-[80px] bg-white text-sm border-orange-200 focus:border-orange-500 focus:ring-orange-200 resize-y"
                    disabled={busy}
                  />
                )}
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-border mb-6">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  {group.map((categoryName) => (
                    <th
                      key={categoryName}
                      scope="col"
                      className="bg-[#1976d2] px-4 py-3 text-left text-sm font-semibold text-white"
                    >
                      {categoryName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rowCount }, (_, rowIndex) => (
                  <tr key={`${tableIndex}-${rowIndex}`}>
                    {group.map((categoryName) => {
                      const categoryIndex = orderedCategories.findIndex(
                        (category) => category.category === categoryName,
                      )

                      return renderCell(categoryName, categoryIndex, rowIndex)
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-red-500" />
            Confirmed
          </span>
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-orange-500" />
            Possible
          </span>
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-green-600" />
            Excluded
          </span>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          {onRegenerate ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onRegenerate(serializeCells(true).filter((category) => category.result.length > 0))}
              disabled={busy}
            >
              <RefreshCw className="size-4" />
              Regenerate Unlocked Causes
            </Button>
          ) : null}
          {!locked ? (
            <Button type="button" onClick={handleFinalize} disabled={busy}>
              Finalize Ishikawa
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={handleExport} disabled={busy}>
            Export
          </Button>
        </div>
      </div>
    </Card>
  )
}
