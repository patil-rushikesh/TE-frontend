'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { FiveWhyAnalysis } from '@/components/five-why-analysis'

interface IshikawaData {
  mainProblem: string
  categories: Array<{
    name: string
    causes: string[]
  }>
}

export function IshikawaDiagram({ data, onCauseStatusChange, onEdit, onFinalize }: { data: IshikawaData, onCauseStatusChange?: (category: string, causeIdx: number, status: string) => void, onEdit?: (category: string, causeIdx: number, value: string) => void, onFinalize?: (finalData: { causes: string[][], statuses: string[][] }) => void }) {
  // Accessibility colors for categories
  const accessibleColors = [
    '#ff8800', '#ffcc80', '#ffe5b4', '#222', '#fff', '#ff4d4d'
  ]
  // Table column order for classic Ishikawa categories
  const classicOrder = [
    'Man', 'Method', 'Machine', 'Material', 'Measurement', 'Environment'
  ]
  // Map categories to classic order
  const orderedCategories = classicOrder.map(cat =>
    data.categories.find(c => c.name.toLowerCase() === cat.toLowerCase()) || {
      name: cat,
      causes: []
    }
  )
  // Helper for cause status (for dropdown)
  const causeStatusOptions = [
    { label: 'Confirmed as Cause', color: '#ff4d4d', bg: '#fff', value: 'confirmed' },
    { label: 'Possible Cause', color: '#ff8800', bg: '#fff', value: 'possible' },
    { label: 'Excluded as Cause', color: '#008000', bg: '#fff', value: 'excluded' },
    { label: 'N/A', color: '#222', bg: '#fff', value: 'na' }
  ]

  // State for cause statuses
  const [causeStatuses, setCauseStatuses] = useState(() => {
    return orderedCategories.map(cat => Array(3).fill('excluded'))
  })
  // State for editable causes
  const [editableCauses, setEditableCauses] = useState(() => {
    return orderedCategories.map(cat => Array(3).fill('').map((_, idx) => cat.causes[idx] || ''))
  })
  // Lock state after finalize
  const [locked, setLocked] = useState(false)

  const handleStatusChange = (catIdx: number, causeIdx: number, status: string) => {
    setCauseStatuses(prev => {
      const updated = prev.map(arr => [...arr])
      updated[catIdx][causeIdx] = status
      return updated
    })
    if (onCauseStatusChange) {
      onCauseStatusChange(orderedCategories[catIdx].name, causeIdx, status)
    }
  }

  const handleCauseEdit = (catIdx: number, causeIdx: number, value: string) => {
    setEditableCauses(prev => {
      const updated = prev.map(arr => [...arr])
      updated[catIdx][causeIdx] = value
      return updated
    })
    if (onEdit) {
      onEdit(orderedCategories[catIdx].name, causeIdx, value)
    }
  }

  const handleFinalize = () => {
    if (onFinalize) {
      onFinalize({ causes: editableCauses, statuses: causeStatuses })
    }
    setLocked(true)
    alert('Ishikawa diagram finalized!')
  }

  const handleExport = () => {
    // Prepare export data
    const exportData = {
      mainProblem: data.mainProblem,
      categories: orderedCategories.map((cat, catIdx) => ({
        name: cat.name,
        causes: editableCauses[catIdx],
        statuses: causeStatuses[catIdx]
      }))
    }
    // Convert to JSON string
    const json = JSON.stringify(exportData, null, 2)
    // Create blob and download
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ishikawa-diagram.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Collect confirmed causes for 5 Why Analysis
  const confirmedCauses: Array<{ category: string; cause: string }> = []
  orderedCategories.forEach((cat, catIdx) => {
    causeStatuses[catIdx].forEach((status, causeIdx) => {
      if (status === 'confirmed' && editableCauses[catIdx][causeIdx]) {
        confirmedCauses.push({
          category: cat.name,
          cause: editableCauses[catIdx][causeIdx]
        })
      }
    })
  })

  return (
    <Card className="w-full p-6 bg-card border-border">
      <h2 className="text-2xl font-bold mb-4 text-foreground" id="ishikawa-title">Ishikawa Diagram</h2>
      <div className="overflow-x-auto">
        {locked && (
          <div className="flex justify-end mb-4">
            <button
              className="px-6 py-2 rounded bg-secondary text-foreground font-semibold shadow hover:bg-orange-700 transition"
              onClick={() => setLocked(false)}
              aria-label="Regenerate Ishikawa Diagram"
            >
              Regenerate
            </button>
          </div>
        )}
        <table className="min-w-full border border-border bg-card rounded-lg" aria-labelledby="ishikawa-title">
          <thead className="bg-muted">
            <tr>
              {orderedCategories.slice(0, 3).map((cat, idx) => (
                <th key={cat.name} scope="col" className="px-4 py-2 text-left text-foreground text-base" style={{ backgroundColor: '#1976d2', color: '#fff' }}>{cat.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map(rowIdx => (
              <tr key={rowIdx} className="border-t border-border">
                {orderedCategories.slice(0, 3).map((cat, colIdx) => (
                  <td key={colIdx} className="px-4 py-2 align-top" style={{ backgroundColor: '#fff' }}>
                    <textarea
                      className="w-full h-16 border border-border rounded p-2 text-xs bg-white text-foreground resize-none"
                      value={editableCauses[colIdx][rowIdx]}
                      onChange={e => handleCauseEdit(colIdx, rowIdx, e.target.value)}
                      aria-label={`Cause for ${cat.name}`}
                      disabled={locked}
                    />
                    <select
                      className="mt-1 w-full text-xs rounded border border-border"
                      aria-label={`Status for ${cat.name} cause ${rowIdx + 1}`}
                      value={causeStatuses[colIdx][rowIdx]}
                      onChange={e => handleStatusChange(colIdx, rowIdx, e.target.value)}
                      disabled={locked}
                    >
                      {causeStatusOptions.map(opt => (
                        <option key={opt.value} value={opt.value} style={{ color: opt.color, backgroundColor: opt.bg }}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center my-4">
          <div className="flex-1 h-2 bg-gradient-to-r from-[#ff8800] to-[#ffcc80] rounded-l-full" />
          <span className="mx-2 font-bold text-orange-600">Cause</span>
          <span className="mx-2 font-bold text-orange-600">→</span>
          <span className="mx-2 font-bold text-orange-600">Effect</span>
          <textarea
            className="flex-1 h-10 border border-border rounded p-2 text-xs bg-white text-foreground resize-none ml-2"
            value={data.mainProblem}
            readOnly
            aria-label="Main Problem (Effect)"
          />
        </div>
        <table className="min-w-full border border-border bg-card rounded-lg mt-4" aria-labelledby="ishikawa-title">
          <thead className="bg-muted">
            <tr>
              {orderedCategories.slice(3).map((cat, idx) => (
                <th key={cat.name} scope="col" className="px-4 py-2 text-left text-foreground text-base" style={{ backgroundColor: '#1976d2', color: '#fff' }}>{cat.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map(rowIdx => (
              <tr key={rowIdx} className="border-t border-border">
                {orderedCategories.slice(3).map((cat, colIdx) => (
                  <td key={colIdx} className="px-4 py-2 align-top" style={{ backgroundColor: '#fff' }}>
                    <textarea
                      className="w-full h-16 border border-border rounded p-2 text-xs bg-white text-foreground resize-none"
                      value={editableCauses[colIdx + 3][rowIdx]}
                      onChange={e => handleCauseEdit(colIdx + 3, rowIdx, e.target.value)}
                      aria-label={`Cause for ${cat.name}`}
                      disabled={locked}
                    />
                    <select
                      className="mt-1 w-full text-xs rounded border border-border"
                      aria-label={`Status for ${cat.name} cause ${rowIdx + 1}`}
                      value={causeStatuses[colIdx + 3][rowIdx]}
                      onChange={e => handleStatusChange(colIdx + 3, rowIdx, e.target.value)}
                      disabled={locked}
                    >
                      {causeStatusOptions.map(opt => (
                        <option key={opt.value} value={opt.value} style={{ color: opt.color, backgroundColor: opt.bg }}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-[#ff4d4d] border border-border" />
            <span className="text-xs">Confirmed as Cause</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-[#ff8800] border border-border" />
            <span className="text-xs">Possible Cause</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-[#008000] border border-border" />
            <span className="text-xs">Excluded as Cause</span>
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-4">
          {!locked && (
            <button
              className="px-6 py-2 rounded bg-primary text-white font-semibold shadow hover:bg-orange-700 transition"
              onClick={handleFinalize}
              aria-label="Finalize Ishikawa Diagram"
            >
              Finalize Ishikawa
            </button>
          )}
          <button
            className="px-6 py-2 rounded bg-accent text-white font-semibold shadow hover:bg-orange-700 transition"
            onClick={handleExport}
            aria-label="Export Ishikawa Diagram"
          >
            Export
          </button>
        </div>
        {/* 5 Why Analysis Section */}
        {confirmedCauses.length > 0 && (
          <div className="mt-10">
            <h3 className="text-xl font-bold mb-4 text-foreground">5 Why Analysis for Confirmed Causes</h3>
            {confirmedCauses.map((item, idx) => (
              <FiveWhyAnalysis key={idx} />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
