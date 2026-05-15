'use client'

import { CANONICAL_BONES, type FiveWhyChainItem, type IshikawaCategory, isMeaningfulIshikawaItem, normalizeIshikawaCategories, normalizeFiveWhyAnalysis } from '@/lib/root-cause'
import {Calendar} from 'lucide-react'
// ─── Severity badge colour ────────────────────────────────────────────────────

function severityColor(s: string): { bg: string; color: string } {
  const n = s.trim().toLowerCase()
  if (n.includes('high') || n.includes('critical')) return { bg: '#fef2f2', color: '#dc2626' }
  if (n.includes('medium')) return { bg: '#fff7ed', color: '#f97316' }
  if (n.includes('low')) return { bg: '#f0fdf4', color: '#16a34a' }
  return { bg: '#f9fafb', color: '#6b7280' }
}

function confidencePct(c: number) {
  return `${Math.round(c * 100)}%`
}

function confidenceColor(c: number): string {
  if (c >= 0.8) return '#16a34a'
  if (c >= 0.5) return '#f97316'
  return '#dc2626'
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '48px 0 24px' }}>
      <div style={{ height: 4, width: 24, borderRadius: 2, background: '#f97316' }} />
      <span style={{
        fontSize: 12, fontWeight: 800, color: '#0f172a',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        whiteSpace: 'nowrap',
      }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
    </div>
  )
}

// ─── Ishikawa read-only view ──────────────────────────────────────────────────

import React from 'react'

function IshikawaReadOnly({ problem, data, mainCause }: { problem: string; data: IshikawaCategory[]; mainCause?: string[] }) {
  const normalized = normalizeIshikawaCategories(data)
  const TABLE_GROUPS = [CANONICAL_BONES.slice(0, 3), CANONICAL_BONES.slice(3)] as const
  const rowCount = Math.max(3, ...normalized.map(c => c.result.filter(isMeaningfulIshikawaItem).length || 3))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Problem banner */}
      <div style={{
        background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: 12,
        padding: '20px 24px',
        display: 'flex', flexDirection: 'column', gap: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Problem Statement
        </span>
        <span style={{ fontSize: 16, color: '#0f172a', fontWeight: 600, lineHeight: 1.4 }}>{problem}</span>
      </div>

      {TABLE_GROUPS.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi === 1 && mainCause && mainCause.length > 0 && (
            <div style={{ padding: '20px 24px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Primary Root Causes (From History)
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mainCause.map((cause, idx) => (
                  <li key={idx} style={{ fontSize: 14, color: '#431407', fontWeight: 600, lineHeight: 1.4 }}>
                    {cause}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div style={{
            overflowX: 'auto', borderRadius: 16, border: '1px solid #f1f5f9',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)', background: '#fff',
          }}>
          <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {group.map(bone => (
                  <th key={bone} style={{
                    background: '#f8fafc', padding: '14px 20px',
                    textAlign: 'left', fontSize: 12, fontWeight: 800,
                    color: '#475569', whiteSpace: 'nowrap',
                    width: `${100 / group.length}%`,
                    borderBottom: '1px solid #f1f5f9',
                    textTransform: 'uppercase', letterSpacing: '0.02em',
                  }}>
                    {bone}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }, (_, rowIdx) => (
                <tr key={rowIdx}>
                  {group.map((bone, boneIdx) => {
                    const cat = normalized.find(c => c.category === bone)
                    const item = cat?.result[rowIdx]
                    const meaningful = item && isMeaningfulIshikawaItem(item)

                    return (
                      <td key={bone} style={{
                        borderBottom: rowIdx < rowCount - 1 ? '1px solid #f8fafc' : 'none',
                        borderLeft: boneIdx > 0 ? '1px solid #f8fafc' : 'none',
                        padding: '16px 20px',
                        verticalAlign: 'top',
                        background: '#fff',
                        width: `${100 / group.length}%`,
                      }}>
                        {meaningful && item ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {/* Sub-category */}
                            {item.sub_category && (
                              <span style={{
                                fontSize: 12, fontWeight: 700,
                                color: '#1e293b', lineHeight: 1.3,
                              }}>
                                {item.sub_category}
                              </span>
                            )}

                            {/* Cause */}
                            {item.cause && (
                              <p style={{
                                margin: 0, fontSize: 13, color: '#475569',
                                lineHeight: 1.6,
                              }}>
                                {item.cause}
                              </p>
                            )}

                            {/* Evidence */}
                            {item.evidence && (
                              <div style={{
                                padding: '8px 12px', background: '#f8fafc', borderRadius: 8,
                                borderLeft: '3px solid #e2e8f0',
                              }}>
                                <p style={{
                                  margin: 0, fontSize: 12, color: '#64748b',
                                  lineHeight: 1.5, fontStyle: 'italic',
                                }}>
                                  "{item.evidence}"
                                </p>
                              </div>
                            )}

                            {/* Footer badges */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                              {item.severity && (
                                <span style={{
                                  fontSize: 10, fontWeight: 800,
                                  padding: '3px 10px', borderRadius: 6,
                                  textTransform: 'uppercase', letterSpacing: '0.02em',
                                  ...severityColor(item.severity),
                                }}>
                                  {item.severity}
                                </span>
                              )}
                              {item.immediate_action && (
                                <span style={{
                                  fontSize: 10, fontWeight: 800, color: '#15803d',
                                  background: '#f0fdf4', border: '1px solid #dcfce7',
                                  borderRadius: 6, padding: '3px 10px',
                                  textTransform: 'uppercase', letterSpacing: '0.02em',
                                }}>
                                  Action Req.
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={{ height: 20 }} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── 5-Why read-only view ─────────────────────────────────────────────────────

function FiveWhyReadOnly({ problem, data }: { problem: string; data: FiveWhyChainItem[] }) {
  const normalized = normalizeFiveWhyAnalysis(data)
  const meaningful = normalized.filter(
    item => item.root_cause.trim() || item.why_chain.some(s => s.question.trim() || s.answer.trim())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {meaningful.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: 16, border: '1px dashed #e2e8f0' }}>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No structured 5-Why analysis recorded.</p>
        </div>
      )}

      {meaningful.map((item, idx) => (
        <div key={item.problem_id ?? idx} style={{
          background: '#fff', border: '1px solid #f1f5f9',
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        }}>
          {/* Card header */}
          <div style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 800, color: '#fff',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                borderRadius: 6, padding: '3px 10px',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Path {idx + 1}
              </span>
              {item.problem_id && (
                <span style={{
                  fontSize: 12, fontWeight: 700, color: '#64748b',
                  background: '#fff', border: '1px solid #e2e8f0',
                  borderRadius: 6, padding: '3px 10px',
                }}>
                  {item.problem_id}
                </span>
              )}
            </div>

            {/* Confidence */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Certainty</span>
              <div style={{ width: 80, height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: confidencePct(item.confidence),
                  background: confidenceColor(item.confidence),
                  borderRadius: 3,
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: confidenceColor(item.confidence), width: 36, textAlign: 'right' }}>
                {confidencePct(item.confidence)}
              </span>
            </div>
          </div>

          {/* Root cause */}
          {item.root_cause && (
            <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                 <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} />
                 <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Identified Root Cause
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', lineHeight: 1.5 }}>
                {item.root_cause}
              </p>
            </div>
          )}

          {/* Why chain */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {item.why_chain.map((step, si) => {
              const hasContent = step.question.trim() || step.answer.trim()
              if (!hasContent) return null
              return (
                <div key={si} style={{
                  display: 'flex',
                  gap: 20,
                  position: 'relative',
                }}>
                  {/* Timeline track */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: '#eff6ff', border: '1.5px solid #bfdbfe',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 900, color: '#1d4ed8', flexShrink: 0,
                      zIndex: 2,
                    }}>
                      {step.level}
                    </div>
                    {si < item.why_chain.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: '#eff6ff', minHeight: 40 }} />
                    )}
                  </div>

                  {/* Q & A */}
                  <div style={{ flex: 1, paddingBottom: 24 }}>
                    <div style={{
                      padding: '16px', borderRadius: 12, background: '#f8fafc',
                      border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                      {step.question && (
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#334155', lineHeight: 1.4 }}>
                          {step.question}
                        </p>
                      )}
                      {step.answer && (
                        <div style={{
                          paddingLeft: 14, borderLeft: '3px solid #3b82f6',
                        }}>
                          <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                            {step.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

export interface HistoryViewerProps {
  problem: string
  domain: string
  createdAt?: string
  ishikawa: IshikawaCategory[]
  fiveWhys: FiveWhyChainItem[]
  mainCause?: string[]
}

export function HistoryViewer({ problem, domain, createdAt, ishikawa, fiveWhys, mainCause }: HistoryViewerProps) {
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {/* Meta header */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, marginBottom: 32, paddingBottom: 16, borderBottom: '2px solid #f1f5f9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            padding: '4px 14px', borderRadius: 8,
            color: '#fff', fontSize: 12, fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)',
          }}>
            {domain}
          </div>
          <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Analysis Report</span>
        </div>
        {formattedDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
            <Calendar size={14} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{formattedDate}</span>
          </div>
        )}
      </div>

      {/* Ishikawa */}
      <SectionDivider label="Ishikawa Root Cause Mapping" />
      {ishikawa.length > 0
        ? <IshikawaReadOnly problem={problem} data={ishikawa} mainCause={mainCause} />
        : <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: 16 }}>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No Ishikawa diagram data available.</p>
          </div>
      }

      {/* 5-Why */}
      <SectionDivider label="5-Why Path Discovery" />
      {fiveWhys.length > 0
        ? <FiveWhyReadOnly problem={problem} data={fiveWhys} />
        : <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: 16 }}>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No 5-Why analysis data available.</p>
          </div>
      }
    </div>
  )
}
