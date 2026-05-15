'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Save, X } from 'lucide-react'
import { type SaveAnalysisRequest, historyApi, storeOrGetTriplet } from '@/lib/history-api'
import type { FiveWhyChainItem, IshikawaCategory } from '@/lib/root-cause'

interface SaveAnalysisModalProps {
  open: boolean
  onClose: () => void
  domain: string
  query: string
  pastRecord: number
  ishikawa: IshikawaCategory[]
  fiveWhys: FiveWhyChainItem[]
  mainCause?: string[]
}

export function SaveAnalysisModal({
  open,
  onClose,
  domain,
  query,
  pastRecord,
  ishikawa,
  fiveWhys,
  mainCause,
}: SaveAnalysisModalProps) {
  const [sessionTitle, setSessionTitle] = useState('')
  const [ticketRef, setTicketRef] = useState('')
  const [partNumber, setPartNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleClose = () => {
    if (saving) return
    setSessionTitle('')
    setTicketRef('')
    setPartNumber('')
    setSaved(false)
    setError(null)
    onClose()
  }

  const handleSave = async () => {
    if (!sessionTitle.trim()) return
    setSaving(true)
    setError(null)
    try {
      const triplet = storeOrGetTriplet()
      const body: SaveAnalysisRequest = {
        ...triplet,
        domain,
        query,
        past_record: pastRecord,
        session_title: sessionTitle.trim(),
        ticket_ref: ticketRef.trim() || undefined,
        part_number: partNumber.trim() || undefined,
        ishikawa,
        analysis: fiveWhys,
        main_cause: mainCause,
      }
      const res = await historyApi.saveAnalysis(body)
      if (res.success) {
        setSaved(true)
        setTimeout(() => {
          setSaved(false)
          setSessionTitle('')
          setTicketRef('')
          setPartNumber('')
          setError(null)
          onClose()
        }, 1600)
      } else {
        setError(res.message ?? 'Save failed.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid #f3f4f6',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Save size={16} color="#f97316" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Save Analysis</span>
          </div>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4, borderRadius: 5 }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        {saved ? (
          <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={36} color="#22c55e" />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#15803d' }}>
              Saved successfully!
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
              Your analysis is now in history.
            </p>
          </div>
        ) : (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Problem context */}
            <div style={{
              background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: 8, padding: '10px 12px',
            }}>
              <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Problem
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{query}</p>
            </div>

            {/* Session title */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                Session Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Assembly Line B – May 2026"
                value={sessionTitle}
                onChange={e => setSessionTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleSave() }}
                autoFocus
                style={{
                  width: '100%', border: '1px solid #d1d5db', borderRadius: 7,
                  padding: '8px 10px', fontSize: 13, color: '#111827',
                  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.12s',
                }}
                onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = '#f97316' }}
                onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = '#d1d5db' }}
              />
            </div>

            {/* Optional fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                  Ticket Ref <span style={{ fontSize: 10, color: '#9ca3af' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="INC-10294"
                  value={ticketRef}
                  onChange={e => setTicketRef(e.target.value)}
                  style={{
                    width: '100%', border: '1px solid #d1d5db', borderRadius: 7,
                    padding: '7px 10px', fontSize: 12, color: '#111827',
                    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.12s',
                  }}
                  onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = '#f97316' }}
                  onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = '#d1d5db' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                  Part Number <span style={{ fontSize: 10, color: '#9ca3af' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="PN-74892"
                  value={partNumber}
                  onChange={e => setPartNumber(e.target.value)}
                  style={{
                    width: '100%', border: '1px solid #d1d5db', borderRadius: 7,
                    padding: '7px 10px', fontSize: 12, color: '#111827',
                    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.12s',
                  }}
                  onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = '#f97316' }}
                  onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = '#d1d5db' }}
                />
              </div>
            </div>

            {error && (
              <p style={{
                margin: 0, padding: '8px 10px',
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 7, fontSize: 12, color: '#dc2626',
              }}>
                {error}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleClose}
                style={{
                  flex: 1, padding: '8px 12px',
                  background: '#f9fafb', border: '1px solid #e5e7eb',
                  borderRadius: 7, fontSize: 13, fontWeight: 600, color: '#6b7280',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !sessionTitle.trim()}
                style={{
                  flex: 2, padding: '8px 12px',
                  background: !sessionTitle.trim() || saving ? '#fed7aa' : '#f97316',
                  border: 'none', borderRadius: 7,
                  fontSize: 13, fontWeight: 700, color: '#fff',
                  cursor: !sessionTitle.trim() || saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background 0.12s',
                }}
              >
                {saving
                  ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                  : <><Save size={13} /> Save to History</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
