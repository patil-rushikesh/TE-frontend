'use client'

import { useState } from 'react'

interface FiveWhyData {
  problem: string
  rows: Array<{
    potentialCause: string
    preventOccurrence: string
    protectEscape: string
    predictSystemic: string
    preventType: string
    escapeType: string
    systemicType: string
  }>
}

const rootCauseTypes = [
  { label: 'Managerial Root Cause', value: 'MRC', color: '#d32f2f' },
  { label: 'Technical Root Cause', value: 'TRC', color: '#1976d2' }
]

export function FiveWhyAnalysis() {
  // Hardcoded sample data for demonstration
  const data: FiveWhyData = {
    problem: 'Pin not fitting in assembly',
    rows: [
      {
        potentialCause: 'burr on pin',
        preventOccurrence: 'burr on pin',
        protectEscape: 'bad parts delivered',
        predictSystemic: 'parts not according spec.',
        preventType: 'TRC',
        escapeType: 'TRC',
        systemicType: 'TRC',
      },
      {
        potentialCause: 'the station was in use for too long',
        preventOccurrence: 'the station was in use for too long',
        protectEscape: 'dewiation was not detected by operators',
        predictSystemic: 'wear of bending station not avaluated in PFMEA',
        preventType: 'TRC',
        escapeType: 'TRC',
        systemicType: 'TRC',
      },
      {
        potentialCause: 'no preventive maintenance performed beofre worn out',
        preventOccurrence: 'no preventive maintenance performed beofre worn out',
        protectEscape: 'No special information for operaotrs available concering visual inspection of cutting area on pin',
        predictSystemic: '',
        preventType: 'TRC',
        escapeType: 'TRC',
        systemicType: '',
      },
      {
        potentialCause: 'Maintenance insufficent',
        preventOccurrence: 'Maintenance insufficent',
        protectEscape: 'failure picture was not included into failure picture catalog',
        predictSystemic: '',
        preventType: 'TRC',
        escapeType: 'TRC',
        systemicType: '',
      },
    ]
  }
  const [rows, setRows] = useState(Array.isArray(data.rows) ? data.rows : [])
  const [locked, setLocked] = useState(false)

  const handleExport = () => {
    const exportData = { problem: data.problem, rows };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'five-why-analysis.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFinalize = () => {
    setLocked(true);
    alert('5 Why Analysis finalized!');
  };

  const handleChange = (rowIdx: number, field: string, value: string) => {
    setRows(prev => {
      const updated = prev.map((row, idx) =>
        idx === rowIdx ? { ...row, [field]: value } : row
      )
      return updated
    })
  }

  return (
    <div className="overflow-x-auto mt-6">
      <div className="mb-4 p-3 bg-muted/30 rounded border border-border">
        <span className="text-sm text-muted-foreground mr-2 font-semibold">Problem:</span>
        <span className="font-semibold text-foreground">{data.problem}</span>
      </div>
      <div className="flex items-center gap-6 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#d32f2f] inline-block border border-border" />
          <span className="text-xs font-semibold">Managerial Root Cause</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#1976d2] inline-block border border-border" />
          <span className="text-xs font-semibold">Technical Root Cause</span>
        </div>
      </div>
      <table className="min-w-full border border-border bg-card rounded-lg text-sm">
        <thead>
          <tr>
            <th className="border border-border bg-[#1976d2] text-white px-2 py-2 w-32 align-top" rowSpan={2} style={{ minWidth: 120 }}>Potential Cause</th>
            <th className="border border-border bg-[#1976d2] text-white px-2 py-2" colSpan={2}>Prevent Occurrence<br /><span className="font-normal text-xs">(How the defect was created?)</span></th>
            <th className="border border-border bg-[#1976d2] text-white px-2 py-2" colSpan={2}>Protect Escape<br /><span className="font-normal text-xs">(How the defect escaped the process controls?)</span></th>
            <th className="border border-border bg-[#1976d2] text-white px-2 py-2" colSpan={2}>Predict Systemic<br /><span className="font-normal text-xs">(How the system failed allowing both the occurrences and escape causes?)</span></th>
          </tr>
          <tr>
            <th className="border border-border bg-[#e3f2fd] text-foreground px-2 py-1">Description</th>
            <th className="border border-border bg-[#e3f2fd] text-foreground px-2 py-1">Type</th>
            <th className="border border-border bg-[#e3f2fd] text-foreground px-2 py-1">Description</th>
            <th className="border border-border bg-[#e3f2fd] text-foreground px-2 py-1">Type</th>
            <th className="border border-border bg-[#e3f2fd] text-foreground px-2 py-1">Description</th>
            <th className="border border-border bg-[#e3f2fd] text-foreground px-2 py-1">Type</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row, rowIdx) => (
            <tr key={rowIdx}>
              {/* Potential Cause (Why?) */}
              <td className="border border-border align-top text-center bg-white" style={{ minWidth: 120 }}>
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="mb-1">
                    <span className="inline-block text-[1.2rem] font-bold text-orange-500">Why?</span>
                  </div>
                  <textarea
                    className="w-full min-w-[100px] min-h-[40px] border border-border rounded p-1 text-xs bg-white text-foreground resize-y"
                    value={row.potentialCause}
                    onChange={e => handleChange(rowIdx, 'potentialCause', e.target.value)}
                    aria-label="Potential Cause"
                    rows={1}
                    disabled={locked}
                  />
                </div>
              </td>
              {/* Prevent Occurrence */}
              <td className="border border-border align-top bg-white">
                <textarea
                  className="w-full min-h-[40px] border border-border rounded p-1 text-xs bg-white text-foreground resize-y"
                  value={row.preventOccurrence}
                  onChange={e => handleChange(rowIdx, 'preventOccurrence', e.target.value)}
                  aria-label="Prevent Occurrence"
                  rows={1}
                  disabled={locked}
                />
              </td>
              <td className="border border-border align-top bg-white w-20 overflow-visible relative z-10">
                <select
                  className="w-full text-xs rounded border border-border bg-white"
                  aria-label="Prevent Occurrence Type"
                  value={row.preventType}
                  onChange={e => handleChange(rowIdx, 'preventType', e.target.value)}
                  style={{ position: 'relative', zIndex: 10 }}
                  disabled={locked}
                >
                  <option value="">Type</option>
                  {rootCauseTypes.map(opt => (
                    <option key={opt.value} value={opt.value} style={{ color: opt.color }}>{opt.label}</option>
                  ))}
                </select>
              </td>
              {/* Protect Escape */}
              <td className="border border-border align-top bg-white">
                <textarea
                  className="w-full min-h-[40px] border border-border rounded p-1 text-xs bg-white text-foreground resize-y"
                  value={row.protectEscape}
                  onChange={e => handleChange(rowIdx, 'protectEscape', e.target.value)}
                  aria-label="Protect Escape"
                  rows={1}
                  disabled={locked}
                />
              </td>
              <td className="border border-border align-top bg-white w-20 overflow-visible relative z-10">
                <select
                  className="w-full text-xs rounded border border-border bg-white"
                  aria-label="Protect Escape Type"
                  value={row.escapeType}
                  onChange={e => handleChange(rowIdx, 'escapeType', e.target.value)}
                  style={{ position: 'relative', zIndex: 10 }}
                  disabled={locked}
                >
                  <option value="">Type</option>
                  {rootCauseTypes.map(opt => (
                    <option key={opt.value} value={opt.value} style={{ color: opt.color }}>{opt.label}</option>
                  ))}
                </select>
              </td>
              {/* Predict Systemic */}
              <td className="border border-border align-top bg-white">
                <textarea
                  className="w-full min-h-[40px] border border-border rounded p-1 text-xs bg-white text-foreground resize-y"
                  value={row.predictSystemic}
                  onChange={e => handleChange(rowIdx, 'predictSystemic', e.target.value)}
                  aria-label="Predict Systemic"
                  rows={1}
                  disabled={locked}
                />
              </td>
              <td className="border border-border align-top bg-white w-20 overflow-visible relative z-10">
                <select
                  className="w-full text-xs rounded border border-border bg-white"
                  aria-label="Predict Systemic Type"
                  value={row.systemicType}
                  onChange={e => handleChange(rowIdx, 'systemicType', e.target.value)}
                  style={{ position: 'relative', zIndex: 10 }}
                  disabled={locked}
                >
                  <option value="">Type</option>
                  {rootCauseTypes.map(opt => (
                    <option key={opt.value} value={opt.value} style={{ color: opt.color }}>{opt.label}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap gap-4 justify-end">
        {!locked && (
          <button
            className="px-6 py-2 rounded bg-primary text-white font-semibold shadow hover:bg-orange-700 transition"
            onClick={handleFinalize}
            aria-label="Finalize 5 Why Analysis"
          >
            Finalize
          </button>
        )}
        {locked && (
          <button
            className="px-6 py-2 rounded bg-secondary text-foreground font-semibold shadow hover:bg-orange-700 transition"
            onClick={() => setLocked(false)}
            aria-label="Regenerate 5 Why Analysis"
          >
            Regenerate
          </button>
        )}
        <button
          className="px-6 py-2 rounded bg-accent text-white font-semibold shadow hover:bg-orange-700 transition"
          onClick={handleExport}
          aria-label="Export 5 Why Analysis"
        >
          Export
        </button>
      </div>
    </div>
  )
}
