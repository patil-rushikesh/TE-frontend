'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  GitBranch,
  Loader2,
  RefreshCw,
  Search,
  X,
  FileText
} from 'lucide-react'
import { HistoryViewer } from '@/components/history-viewer'
import { type HistorySession, historyApi, storeOrGetTriplet } from '@/lib/history-api'
import type { FiveWhyChainItem, IshikawaCategory } from '@/lib/root-cause'

interface HistorySidebarProps {
  onLoad: (session: {
    query: string
    domain: string
    ishikawa: IshikawaCategory[]
    fiveWhys: FiveWhyChainItem[]
    main_cause?: string[]
  }) => void
  refreshTrigger?: number
}

function timeAgo(iso: string) {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return '' }
}

function groupByDate(sessions: HistorySession[]) {
  const now = Date.now()
  const groups: { label: string; items: HistorySession[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This Week', items: [] },
    { label: 'Older', items: [] },
  ]
  for (const s of sessions) {
    const diff = Math.floor((now - new Date(s.created_at).getTime()) / 86400000)
    if (diff === 0) groups[0].items.push(s)
    else if (diff === 1) groups[1].items.push(s)
    else if (diff < 7) groups[2].items.push(s)
    else groups[3].items.push(s)
  }
  return groups.filter(g => g.items.length > 0)
}

export function HistorySidebar({ onLoad, refreshTrigger }: HistorySidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)

  // Detail drawer state
  const [detailSession, setDetailSession] = useState<HistorySession | null>(null)
  const hasFetched = useRef(false)

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const triplet = storeOrGetTriplet()
      const res = await historyApi.fetchHistory(triplet)
      setSessions(res.success ? (res.sessions ?? []) : [])
      if (!res.success) setError(res.message ?? 'Failed to load history.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [refreshTrigger])

  const filtered = sessions.filter(s =>
    !search.trim() ||
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.query?.toLowerCase().includes(search.toLowerCase()) ||
    s.domain?.toLowerCase().includes(search.toLowerCase()),
  )

  const grouped = groupByDate(filtered)

  // Click = preview in drawer; double-click / "Load" btn = inject into main page
  const handlePreview = (session: HistorySession) => {
    setActiveId(session.session_id)
    setDetailSession(session)
  }

  const handleLoadSession = (session: HistorySession) => {
    onLoad({
      query: session.query,
      domain: session.domain || 'General',
      ishikawa: session.ishikawa,
      fiveWhys: session.five_whys,
      main_cause: session.main_cause,
    })
    setDetailSession(null)
    setActiveId(null)
  }

  const closeDetail = () => {
    setDetailSession(null)
    setActiveId(null)
  }

  return (
    <>
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: collapsed ? 60 : 280,
          minWidth: collapsed ? 60 : 280,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          background: '#ffffff',
          borderRight: '1px solid #f1f5f9',
          overflow: 'hidden',
          flexShrink: 0,
          zIndex: 30,
          boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '20px 0' : '20px 16px',
          borderBottom: '1px solid #f1f5f9',
          flexShrink: 0,
          gap: 12,
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                width: 28, height: 28, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)',
              }}>
                <Clock size={16} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{
                fontSize: 14, fontWeight: 700, color: '#0f172a',
                letterSpacing: '-0.02em',
              }}>
                History
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '6px', cursor: 'pointer', color: '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = '#f1f5f9';
              el.style.color = '#334155';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = '#f8fafc';
              el.style.color = '#64748b';
            }}
          >
            {collapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
          </button>
        </div>

        {/* Collapsed icon-strip */}
        {collapsed && (
          <div style={{
            flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 12, padding: '16px 0',
            scrollbarWidth: 'none',
          }}>
            <button
              onClick={fetchHistory}
              title="Refresh"
              style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', padding: 8,
                cursor: 'pointer', color: '#94a3b8', borderRadius: 8, display: 'flex',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLButtonElement).style.color = '#f97316' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8' }}
            >
              <RefreshCw size={18} />
            </button>
            <div style={{ height: 1, width: 24, background: '#f1f5f9' }} />
            {sessions.slice(0, 15).map(s => {
              const isActive = activeId === s.session_id
              return (
                <button
                  key={s.session_id}
                  onClick={() => handlePreview(s)}
                  title={s.title || s.query}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    border: 'none',
                    background: isActive ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)' : '#f8fafc',
                    boxShadow: isActive ? 'inset 0 0 0 1.5px #f97316' : 'none',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    color: isActive ? '#ea580c' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s', flexShrink: 0,
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc' }}
                >
                  {(s.title || s.query).charAt(0).toUpperCase()}
                </button>
              )
            })}
          </div>
        )}

        {/* Expanded panel */}
        {!collapsed && (
          <>
            {/* Search */}
            <div style={{ padding: '16px 16px 8px', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search your history..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', border: '1px solid #e2e8f0', borderRadius: 10,
                    padding: '10px 32px 10px 36px', fontSize: 13, color: '#1e293b',
                    background: '#f8fafc', outline: 'none', boxSizing: 'border-box',
                    transition: 'all 0.2s',
                  }}
                  onFocus={e => {
                    const el = e.currentTarget as HTMLInputElement;
                    el.style.borderColor = '#f97316';
                    el.style.background = '#fff';
                    el.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                  }}
                  onBlur={e => {
                    const el = e.currentTarget as HTMLInputElement;
                    el.style.borderColor = '#e2e8f0';
                    el.style.background = '#f8fafc';
                    el.style.boxShadow = 'none';
                  }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 4, borderRadius: '50%' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Refresh */}
            <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
              <button
                onClick={fetchHistory}
                disabled={loading}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px',
                  fontSize: 12, fontWeight: 600, color: '#475569',
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#cbd5e1' } }}
                onMouseLeave={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0' } }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {loading ? 'Refreshing...' : 'Refresh History'}
              </button>
            </div>

            <div style={{ height: 1, background: '#f1f5f9', flexShrink: 0, margin: '0 16px' }} />

            {/* Session list */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '12px 8px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#e2e8f0 transparent',
            }}>
              {error ? (
                <div style={{ margin: '12px 8px', padding: '12px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>Error Loading History</span>
                  <p style={{ margin: 0, fontSize: 11, color: '#b91c1c', lineHeight: 1.5 }}>{error}</p>
                </div>
              ) : loading && sessions.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 16px', gap: 12, color: '#94a3b8' }}>
                  <Loader2 size={24} className="animate-spin" color="#f97316" />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Syncing...</span>
                </div>
              ) : grouped.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8', fontSize: 12, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <Search size={20} color="#cbd5e1" />
                  </div>
                  {search ? `No matches for "${search}"` : 'Your future analyses will appear here once finalized.'}
                </div>
              ) : (
                grouped.map(group => (
                  <div key={group.label} style={{ marginBottom: 16 }}>
                    <p style={{
                      padding: '0 12px 8px', fontSize: 11, fontWeight: 700, color: '#94a3b8',
                      textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0,
                    }}>
                      {group.label}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {group.items.map(session => {
                        const isActive = activeId === session.session_id
                        return (
                          <button
                            key={session.session_id}
                            onClick={() => handlePreview(session)}
                            title={session.query}
                            style={{
                              width: '100%', display: 'flex', flexDirection: 'column', gap: 6,
                              padding: '12px',
                              background: isActive ? '#ffffff' : 'transparent',
                              borderRadius: 12,
                              border: 'none',
                              boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.06), inset 0 0 0 1.5px #f97316' : 'none',
                              cursor: 'pointer', textAlign: 'left',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              position: 'relative',
                            }}
                            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc' }}
                            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                          >
                            <span style={{
                              fontSize: 13, fontWeight: 700,
                              color: isActive ? '#0f172a' : '#334155',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              lineHeight: 1.3,
                            }}>
                              {session.title || session.query}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: 10, color: '#fff', fontWeight: 800,
                                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                borderRadius: 6, padding: '2px 8px',
                                textTransform: 'uppercase', letterSpacing: '0.02em',
                              }}>
                                {session.domain}
                              </span>
                              <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={10} />
                                {timeAgo(session.created_at)}
                              </span>
                            </div>
                            {session.root_causes?.[0] && (
                              <div style={{
                                display: 'flex', alignItems: 'flex-start', gap: 6,
                                padding: '6px 8px', background: isActive ? '#f8fafc' : '#f1f5f9',
                                borderRadius: 8, marginTop: 2,
                              }}>
                                <GitBranch size={10} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 2 }} />
                                <span style={{
                                  fontSize: 11, color: '#64748b', lineHeight: 1.4,
                                  display: '-webkit-box', WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                  fontWeight: 500,
                                }}>
                                  {session.root_causes[0]}
                                </span>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {sessions.length > 0 && (
              <div style={{
                borderTop: '1px solid #f1f5f9', padding: '12px 16px',
                fontSize: 11, color: '#94a3b8', flexShrink: 0,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#f8fafc',
              }}>
                <span style={{ fontWeight: 600 }}>{sessions.length} sessions</span>
                {search && filtered.length !== sessions.length && (
                  <span style={{ fontSize: 10, color: '#64748b', background: '#e2e8f0', padding: '1px 6px', borderRadius: 4 }}>
                    {filtered.length} found
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </aside>

      {/* ── Detail Drawer (read-only HistoryViewer) ── */}
      {detailSession && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeDetail}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(15, 23, 42, 0.3)',
              backdropFilter: 'blur(4px)',
              animation: 'fadeIn 0.3s ease',
            }}
          />

          {/* Drawer panel */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: collapsed ? 60 : 280,
              bottom: 0,
              width: 'min(920px, calc(100vw - (collapsed ? 60px : 280px)))',
              zIndex: 101,
              background: '#fff',
              borderLeft: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '20px 0 50px rgba(0,0,0,0.15)',
              animation: 'slideInDrawer 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Drawer header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 32px',
              borderBottom: '1px solid #f1f5f9',
              flexShrink: 0,
              gap: 16,
              background: '#fff',
            }}>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                   <div style={{
                    background: '#fff7ed', border: '1.5px solid #fdba74',
                    width: 24, height: 24, borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FileText size={14} color="#f97316" />
                  </div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>
                    {detailSession.title || detailSession.query}
                  </h2>
                </div>
                {detailSession.title && detailSession.title !== detailSession.query && (
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {detailSession.query}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                {/* Load into editor button */}
                <button
                  onClick={() => handleLoadSession(detailSession)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    border: 'none', borderRadius: 10,
                    padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.transform = 'translateY(-1px)';
                    el.style.boxShadow = '0 6px 16px rgba(234, 88, 12, 0.35)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.transform = 'none';
                    el.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.25)';
                  }}
                >
                  Restore to Editor <ArrowRight size={16} strokeWidth={2.5} />
                </button>

                {/* Close */}
                <button
                  onClick={closeDetail}
                  style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
                    padding: '10px', cursor: 'pointer', color: '#64748b', display: 'flex',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLButtonElement).style.color = '#0f172a' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b' }}
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Drawer body — scrollable HistoryViewer */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '40px 40px 60px',
              background: '#fdfdfd',
            }}>
              <div style={{ maxWidth: 840, margin: '0 auto' }}>
                <HistoryViewer
                  problem={detailSession.query}
                  domain={detailSession.domain}
                  createdAt={detailSession.created_at}
                  ishikawa={detailSession.ishikawa ?? []}
                  fiveWhys={detailSession.five_whys ?? []}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInDrawer {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  )
}

