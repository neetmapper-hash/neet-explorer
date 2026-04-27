'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Concept {
  concept_id: string
  class: number
  chapter_number: number
  chapter_name: string
  concept_name: string
  summary: string
  builds_upon: string[]
}

interface ConceptsData { subject: string; concepts: Concept[] }
interface Mapping { year: number; question_number: number; concept_id: string | null; status: string }
interface MappingData { mappings: Mapping[] }

interface ChapterInfo {
  key: string
  class: number
  chapter_number: number
  chapter_name: string
  concepts: Concept[]
  dependsOn: Set<string> // chapter keys
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const CLASS_COLORS: Record<number, { bg: string; border: string; text: string; tag: string; tagText: string; light: string }> = {
  9:  { bg: '#f0fdf4', border: '#16a34a', text: '#14532d', tag: '#dcfce7', tagText: '#166634', light: '#bbf7d0' },
  10: { bg: '#eff6ff', border: '#2563eb', text: '#1e3a8a', tag: '#dbeafe', tagText: '#1d4ed8', light: '#bfdbfe' },
  11: { bg: '#faf5ff', border: '#9333ea', text: '#581c87', tag: '#f3e8ff', tagText: '#7e22ce', light: '#e9d5ff' },
  12: { bg: '#fff7ed', border: '#ea580c', text: '#7c2d12', tag: '#ffedd5', tagText: '#c2410c', light: '#fed7aa' },
}
const CLASS_LABELS: Record<number, string> = {
  9: 'Class IX', 10: 'Class X', 11: 'Class XI', 12: 'Class XII',
}

// ─── Chapter Node (Mode 1) ────────────────────────────────────────────────────

function ChapterMapNode({ data }: { data: any }) {
  const colors = CLASS_COLORS[data.classNum] || CLASS_COLORS[9]
  const isSelected = data.isSelected
  const w = data.nodeW || 260
  const fs = data.fontSize || 16

  return (
    <div
      onClick={() => data.onNodeClick && data.onNodeClick(data)}
      style={{
        background: isSelected ? colors.border : colors.bg,
        border: `2.5px solid ${colors.border}`,
        borderRadius: '12px',
        padding: `${Math.round(w * 0.06)}px ${Math.round(w * 0.07)}px`,
        width: `${w}px`,
        cursor: 'pointer',
        boxShadow: isSelected ? `0 6px 24px ${colors.border}66` : `0 2px 8px ${colors.border}22`,
        position: 'relative',
        transition: 'all 0.15s ease',
      }}
    >
      <Handle type="target" position={Position.Left}
        style={{ background: isSelected ? 'white' : colors.border, width: 12, height: 12, border: '2px solid white' }} />

      <div style={{
        fontSize: `${Math.max(9, Math.round(fs * 0.6))}px`,
        fontWeight: 800, letterSpacing: '0.08em',
        color: isSelected ? 'rgba(255,255,255,0.75)' : colors.border,
        marginBottom: '5px', textTransform: 'uppercase',
      }}>
        {CLASS_LABELS[data.classNum]}
      </div>

      <div style={{
        fontSize: `${fs}px`, fontWeight: 800,
        color: isSelected ? 'white' : colors.text,
        lineHeight: 1.35,
        marginBottom: '8px',
      }}>
        {data.chapterName}
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {data.questionCount > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            background: isSelected ? 'rgba(255,255,255,0.2)' : colors.tag,
            borderRadius: '20px', padding: '3px 8px',
            fontSize: `${Math.max(10, Math.round(fs * 0.7))}px`,
            color: isSelected ? 'white' : colors.tagText, fontWeight: 700,
          }}>
            📝 {data.questionCount}Q
          </div>
        )}
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: isSelected ? 'rgba(255,255,255,0.15)' : `${colors.border}15`,
          borderRadius: '20px', padding: '3px 8px',
          fontSize: `${Math.max(10, Math.round(fs * 0.7))}px`,
          color: isSelected ? 'rgba(255,255,255,0.85)' : colors.text, fontWeight: 600,
        }}>
          {data.conceptCount} concepts
        </div>
      </div>

      <Handle type="source" position={Position.Right}
        style={{ background: isSelected ? 'white' : colors.border, width: 12, height: 12, border: '2px solid white' }} />
    </div>
  )
}

// ─── Concept Node (Mode 2) ────────────────────────────────────────────────────

function ConceptMapNode({ data }: { data: any }) {
  const colors = CLASS_COLORS[data.classNum] || CLASS_COLORS[9]
  const isSelected = data.isSelected
  const w = data.nodeW || 260
  const fs = data.fontSize || 15
  const concepts: Concept[] = data.conceptObjects || []
  const extra = concepts.length > 2 ? concepts.length - 2 : 0
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleConcept = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div
      style={{
        background: isSelected ? colors.border : colors.bg,
        border: `2.5px solid ${colors.border}`,
        borderRadius: '12px',
        padding: `${Math.round(w * 0.06)}px ${Math.round(w * 0.07)}px`,
        width: `${w}px`,
        cursor: 'pointer',
        boxShadow: isSelected ? `0 6px 24px ${colors.border}66` : `0 2px 8px ${colors.border}22`,
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left}
        style={{ background: isSelected ? 'white' : colors.border, width: 12, height: 12, border: '2px solid white' }} />

      {/* Class label */}
      <div style={{
        fontSize: `${Math.max(9, Math.round(fs * 0.6))}px`,
        fontWeight: 800, letterSpacing: '0.08em',
        color: isSelected ? 'rgba(255,255,255,0.75)' : colors.border,
        marginBottom: '4px', textTransform: 'uppercase',
      }}>
        {CLASS_LABELS[data.classNum]}
      </div>

      {/* Chapter name bold */}
      <div style={{
        fontSize: `${fs}px`, fontWeight: 800,
        color: isSelected ? 'white' : colors.text,
        lineHeight: 1.3, marginBottom: '8px',
      }}>
        {data.chapterName}
      </div>

      {/* Divider */}
      <div style={{
        height: '1px',
        background: isSelected ? 'rgba(255,255,255,0.25)' : `${colors.border}33`,
        marginBottom: '8px',
      }} />

      {/* Concept list — accordion, max 2 shown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {concepts.slice(0, 2).map((concept) => {
          const isOpen = expandedId === concept.concept_id
          return (
            <div key={concept.concept_id}>
              {/* Concept row */}
              <div
                onClick={(e) => toggleConcept(concept.concept_id, e)}
                style={{
                  fontSize: `${Math.max(11, Math.round(fs * 0.78))}px`,
                  color: isSelected ? 'rgba(255,255,255,0.9)' : colors.text,
                  lineHeight: 1.3,
                  display: 'flex', alignItems: 'flex-start', gap: '5px',
                  cursor: 'pointer',
                  padding: '3px 4px',
                  borderRadius: '6px',
                  background: isOpen
                    ? (isSelected ? 'rgba(255,255,255,0.15)' : `${colors.border}12`)
                    : 'transparent',
                  transition: 'background 0.12s',
                }}
              >
                <span style={{
                  color: isSelected ? 'rgba(255,255,255,0.5)' : colors.border,
                  flexShrink: 0, marginTop: '1px', fontSize: '10px',
                  transition: 'transform 0.15s',
                  display: 'inline-block',
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                }}>▶</span>
                <span>{concept.concept_name}</span>
              </div>

              {/* Expanded summary */}
              {isOpen && concept.summary && (
                <div style={{
                  marginLeft: '16px',
                  marginTop: '4px',
                  marginBottom: '4px',
                  padding: '6px 8px',
                  background: isSelected ? 'rgba(255,255,255,0.12)' : `${colors.border}0d`,
                  borderLeft: `2px solid ${isSelected ? 'rgba(255,255,255,0.4)' : colors.border}`,
                  borderRadius: '0 6px 6px 0',
                  fontSize: `${Math.max(10, Math.round(fs * 0.72))}px`,
                  color: isSelected ? 'rgba(255,255,255,0.85)' : colors.text,
                  lineHeight: 1.5,
                }}>
                  {concept.summary}
                </div>
              )}
            </div>
          )
        })}

        {/* "+ N more" button */}
        {extra > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              data.onShowMore && data.onShowMore(data)
            }}
            style={{
              marginTop: '4px',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: `${Math.max(11, Math.round(fs * 0.75))}px`,
              fontWeight: 700,
              color: isSelected ? 'rgba(255,255,255,0.75)' : colors.border,
              textAlign: 'left',
              fontFamily: 'inherit',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
            }}
          >
            + {extra} more...
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Right}
        style={{ background: isSelected ? 'white' : colors.border, width: 12, height: 12, border: '2px solid white' }} />
    </div>
  )
}

const nodeTypes = { chapterMapNode: ChapterMapNode, conceptMapNode: ConceptMapNode }

// ─── Build chapter dependency map ─────────────────────────────────────────────

function buildChapterRegistry(concepts: Concept[]): Record<string, ChapterInfo> {
  const registry: Record<string, ChapterInfo> = {}

  // Build concept-to-chapter lookup
  const conceptToChapter: Record<string, string> = {}
  for (const c of concepts) {
    const key = `${c.class}_${c.chapter_number}`
    conceptToChapter[c.concept_id] = key
    if (!registry[key]) {
      registry[key] = {
        key,
        class: c.class,
        chapter_number: c.chapter_number,
        chapter_name: c.chapter_name,
        concepts: [],
        dependsOn: new Set(),
      }
    }
    registry[key].concepts.push(c)
  }

  // Derive chapter-to-chapter dependencies
  for (const ch of Object.values(registry)) {
    for (const concept of ch.concepts) {
      for (const parentId of concept.builds_upon || []) {
        const parentChKey = conceptToChapter[parentId]
        if (parentChKey && parentChKey !== ch.key) {
          ch.dependsOn.add(parentChKey)
        }
      }
    }
  }

  return registry
}

// ─── Tree builder ─────────────────────────────────────────────────────────────

function buildChapterTree(
  selectedChapterKey: string,
  registry: Record<string, ChapterInfo>,
  questionCounts: Record<string, number>,
  direction: 'ltr' | 'rtl',
  onChapterClick: (data: any) => void,
  onShowMore: (data: any) => void,
  availableW: number,
  availableH: number,
  mode: 'chapter' | 'concept',
  selectedConceptId: string | null,
): { nodes: Node[]; edges: Edge[] } {

  const selectedChapter = registry[selectedChapterKey]
  if (!selectedChapter) return { nodes: [], edges: [] }

  const includedKeys = new Set<string>()

  // Traverse upward through chapter dependencies
  const traverseUp = (key: string, visited = new Set<string>()): void => {
    if (visited.has(key) || !registry[key]) return
    visited.add(key); includedKeys.add(key)
    for (const depKey of Array.from(registry[key].dependsOn)) {
      traverseUp(depKey, visited)
    }
  }

  // Find chapters that depend on this chapter (downward)
  const getDirectChildChapters = (key: string): string[] => {
    return Object.keys(registry).filter(k =>
      registry[k].dependsOn.has(key) && k !== key
    )
  }

  traverseUp(selectedChapterKey)
  for (const childKey of getDirectChildChapters(selectedChapterKey)) {
    includedKeys.add(childKey)
  }

  // Group by class
  const byClass: Record<number, string[]> = { 9: [], 10: [], 11: [], 12: [] }
  for (const key of Array.from(includedKeys)) {
    const ch = registry[key]
    if (ch && byClass[ch.class] !== undefined) byClass[ch.class].push(key)
  }

  const classOrderLTR = [9, 10, 11, 12]
  const classOrder = direction === 'ltr' ? classOrderLTR : [12, 11, 10, 9]
  const presentClasses = classOrder.filter(cls => byClass[cls] && byClass[cls].length > 0)
  const numCols = presentClasses.length
  if (numCols === 0) return { nodes: [], edges: [] }

  const maxNodesInCol = Math.max(...presentClasses.map(cls => byClass[cls].length))
  const H_GAP = Math.max(60, availableW * 0.06)
  const V_GAP = Math.max(20, availableH * 0.04)
  const NODE_W = Math.max(200, Math.floor((availableW - (numCols - 1) * H_GAP) / numCols))
  const NODE_H = Math.max(100, Math.floor((availableH - (maxNodesInCol - 1) * V_GAP) / maxNodesInCol))
  const FONT_SIZE = Math.max(13, Math.min(20, Math.round(NODE_W / 15)))

  const classX: Record<number, number> = {}
  presentClasses.forEach((cls, idx) => { classX[cls] = idx * (NODE_W + H_GAP) })

  const nodes: Node[] = []
  const edges: Edge[] = []
  const edgeSet = new Set<string>()

  const makeEdge = (fromKey: string, toKey: string, colorClass: number, highlighted = false) => {
    const edgeId = `${fromKey}→${toKey}`
    if (edgeSet.has(edgeId)) return
    edgeSet.add(edgeId)
    const colors = CLASS_COLORS[colorClass] || CLASS_COLORS[9]
    edges.push({
      id: `e-${fromKey}-${toKey}`,
      source: fromKey,
      target: toKey,
      type: 'smoothstep',
      animated: highlighted,
      style: { stroke: colors.border, strokeWidth: highlighted ? 4 : 3 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
    })
  }

  // Build nodes
  presentClasses.forEach(classNum => {
    const chapterKeys = byClass[classNum] || []
    const x = classX[classNum]
    const totalH = chapterKeys.length * NODE_H + (chapterKeys.length - 1) * V_GAP
    const startY = -totalH / 2

    chapterKeys.forEach((key, idx) => {
      const ch = registry[key]
      const isSelected = key === selectedChapterKey
      const y = startY + idx * (NODE_H + V_GAP)

      // Question count for this chapter
      const chapterQCount = ch.concepts.reduce((s, c) => s + (questionCounts[c.concept_id] || 0), 0)

      if (mode === 'chapter') {
        nodes.push({
          id: key, type: 'chapterMapNode',
          position: { x, y },
          data: {
            chapterName: ch.chapter_name,
            classNum: ch.class,
            questionCount: chapterQCount,
            conceptCount: ch.concepts.length,
            isSelected,
            nodeW: NODE_W,
            fontSize: FONT_SIZE,
            chapterKey: key,
            concepts: ch.concepts,
            onNodeClick: onChapterClick,
          },
        })
      } else {
        // In concept mode — show which concepts from this chapter are relevant
        // For selected chapter: show the selected concept
        // For ancestor chapters: show concepts that are prerequisites of selected concept
        let relevantConcepts: Concept[] = []

        if (isSelected && selectedConceptId) {
          const sc = ch.concepts.find(c => c.concept_id === selectedConceptId)
          relevantConcepts = sc ? [sc] : []
        } else if (selectedConceptId) {
          const visited = new Set<string>()
          const conceptMap = new Map(
            Object.values(registry).flatMap(r => r.concepts).map(c => [c.concept_id, c])
          )
          const findAncestors = (id: string): void => {
            if (visited.has(id)) return
            visited.add(id)
            const c = conceptMap.get(id)
            if (!c) return
            for (const pid of c.builds_upon || []) findAncestors(pid)
          }
          const sc = ch.concepts.find(c => c.concept_id === selectedConceptId)
          if (sc) findAncestors(sc.concept_id)
          relevantConcepts = ch.concepts
            .filter(c => visited.has(c.concept_id) && c.concept_id !== selectedConceptId)
        } else {
          relevantConcepts = ch.concepts.slice(0, 3)
        }

        nodes.push({
          id: key, type: 'conceptMapNode',
          position: { x, y },
          data: {
            chapterName: ch.chapter_name,
            classNum: ch.class,
            conceptObjects: relevantConcepts,
            isSelected,
            nodeW: NODE_W,
            fontSize: FONT_SIZE,
            chapterKey: key,
            allConcepts: ch.concepts,
            questionCount: chapterQCount,
            onShowMore: onShowMore,
            onNodeClick: onChapterClick,
          },
        })
      }
    })
  })

  // Build edges: chapter depends on another chapter
  for (const key of Array.from(includedKeys)) {
    const ch = registry[key]
    if (!ch) continue
    for (const depKey of Array.from(ch.dependsOn)) {
      if (!includedKeys.has(depKey)) continue
      const depCh = registry[depKey]
      if (!depCh) continue
      const highlighted = key === selectedChapterKey || depKey === selectedChapterKey
      makeEdge(depKey, key, depCh.class, highlighted)
    }
  }

  return { nodes, edges }
}

// ─── Chapter Detail Popup ─────────────────────────────────────────────────────

function ChapterPopup({
  chapter,
  questionCounts,
  onClose,
}: {
  chapter: ChapterInfo
  questionCounts: Record<string, number>
  onClose: () => void
}) {
  const colors = CLASS_COLORS[chapter.class]
  const qCount = chapter.concepts.reduce((s, c) => s + (questionCounts[c.concept_id] || 0), 0)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: 'white', border: `2px solid ${colors.border}`, borderRadius: '16px', padding: '28px', maxWidth: '560px', width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: colors.border, textTransform: 'uppercase', marginBottom: '6px' }}>
              {CLASS_LABELS[chapter.class]}
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', lineHeight: 1.2, margin: 0 }}>
              {chapter.chapter_name}
            </h2>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              {qCount > 0 && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: colors.tagText, background: colors.tag, borderRadius: '20px', padding: '3px 10px' }}>
                  📝 {qCount} NEET questions
                </span>
              )}
              <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text, background: `${colors.border}15`, borderRadius: '20px', padding: '3px 10px' }}>
                {chapter.concepts.length} concepts
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', color: '#6b7280', cursor: 'pointer', padding: '6px 10px', fontSize: '14px', flexShrink: 0 }}>✕</button>
        </div>

        {/* Concepts list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Concepts in this chapter
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {chapter.concepts.map((c, i) => {
              const qc = questionCounts[c.concept_id] || 0
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
                    <span style={{ color: colors.border, marginTop: '2px', flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.4 }}>{c.concept_name}</span>
                  </div>
                  {qc > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: colors.tagText, background: colors.tag, borderRadius: '20px', padding: '2px 8px', flexShrink: 0, marginLeft: '8px' }}>
                      {qc}Q
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── More Concepts Popup ──────────────────────────────────────────────────────

function MoreConceptsPopup({
  chapterName,
  classNum,
  concepts,
  onClose,
}: {
  chapterName: string
  classNum: number
  concepts: string[]
  onClose: () => void
}) {
  const colors = CLASS_COLORS[classNum]
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: 'white', border: `2px solid ${colors.border}`, borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '100%', maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: colors.border, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{CLASS_LABELS[classNum]}</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{chapterName}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Relevant concepts ({concepts.length})</div>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', color: '#6b7280', cursor: 'pointer', padding: '6px 10px', fontSize: '14px' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {concepts.map((name, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 12px', background: colors.bg, borderRadius: '8px', border: `1px solid ${colors.border}33` }}>
              <span style={{ color: colors.border, flexShrink: 0, marginTop: '2px' }}>•</span>
              <span style={{ fontSize: '13px', color: colors.text, lineHeight: 1.4 }}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Subject = 'Chemistry' | 'Physics'
const SUBJECT_FILES: Record<Subject, { concepts: string; mapping: string }> = {
  Chemistry: { concepts: '/chemistry_concepts_new.json', mapping: '/chemistry_question_mapping.json' },
  Physics:   { concepts: '/physics_concepts_new.json',   mapping: '/physics_question_mapping.json' },
}

export default function ConceptMapPage() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 700 })
  const [subject, setSubject] = useState<Subject>('Chemistry')
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [pendingClass, setPendingClass] = useState<number>(12)
  const [pendingChapter, setPendingChapter] = useState<string | null>(null)
  const [pendingConcept, setPendingConcept] = useState<string>('all')
  const [pendingDirection, setPendingDirection] = useState<'ltr' | 'rtl'>('ltr')

  const [appliedClass, setAppliedClass] = useState<number | null>(null)
  const [appliedChapter, setAppliedChapter] = useState<string | null>(null)
  const [appliedConcept, setAppliedConcept] = useState<string>('all')
  const [appliedDirection, setAppliedDirection] = useState<'ltr' | 'rtl'>('ltr')

  const [chapterPopup, setChapterPopup] = useState<ChapterInfo | null>(null)
  const [morePopup, setMorePopup] = useState<{ chapterName: string; classNum: number; concepts: string[] } | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Track container size
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Load data — reloads when subject changes
  useEffect(() => {
    setLoading(true)
    setConcepts([])
    setQuestionCounts({})
    setPendingChapter(null)
    setPendingConcept('all')
    setAppliedChapter(null)
    setAppliedConcept('all')
    setNodes([] as any)
    setEdges([] as any)
    async function load() {
      try {
        const files = SUBJECT_FILES[subject]
        const [cRes, mRes] = await Promise.all([
          fetch(files.concepts),
          fetch(files.mapping),
        ])
        const cData: ConceptsData = await cRes.json()
        const mData: MappingData = await mRes.json()
        const counts: Record<string, number> = {}
        for (const m of mData.mappings) {
          if (m.concept_id && m.concept_id !== 'NONE' && m.status !== 'uncertain') {
            counts[m.concept_id] = (counts[m.concept_id] || 0) + 1
          }
        }
        setConcepts(cData.concepts.filter(c => c.concept_name))
        setQuestionCounts(counts)
        setLoading(false)
      } catch (err) {
        console.error(err); setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject])

  // Build chapter registry
  const registry = useMemo(() => buildChapterRegistry(concepts), [concepts])

  // Chapters for pending class
  const chaptersForClass = useMemo(() => {
    return Object.values(registry)
      .filter(ch => ch.class === pendingClass)
      .sort((a, b) => a.chapter_number - b.chapter_number)
      .map(ch => ({
        key: ch.key,
        name: ch.chapter_name,
        count: ch.concepts.reduce((s, c) => s + (questionCounts[c.concept_id] || 0), 0),
      }))
  }, [registry, pendingClass, questionCounts])

  // Concepts for pending chapter
  const conceptsForChapter = useMemo(() => {
    if (!pendingChapter || !registry[pendingChapter]) return []
    return registry[pendingChapter].concepts
  }, [registry, pendingChapter])

  const handleChapterNodeClick = useCallback((data: any) => {
    const ch = registry[data.chapterKey]
    if (ch) setChapterPopup(ch)
  }, [registry])

  const handleShowMore = useCallback((data: any) => {
    setMorePopup({
      chapterName: data.chapterName,
      classNum: data.classNum,
      concepts: (data.conceptObjects || []).map((c: Concept) => c.concept_name),
    })
  }, [])

  const handleGo = useCallback(() => {
    if (!pendingChapter) return
    setAppliedClass(pendingClass)
    setAppliedChapter(pendingChapter)
    setAppliedConcept(pendingConcept)
    setAppliedDirection(pendingDirection)
  }, [pendingClass, pendingChapter, pendingConcept, pendingDirection])

  const mode: 'chapter' | 'concept' = appliedConcept === 'all' ? 'chapter' : 'concept'

  // Build tree
  useEffect(() => {
    if (!appliedChapter || !registry[appliedChapter]) {
      setNodes([] as any); setEdges([] as any); return
    }
    const { nodes: n, edges: e } = buildChapterTree(
      appliedChapter, registry, questionCounts, appliedDirection,
      handleChapterNodeClick, handleShowMore,
      containerSize.width, containerSize.height,
      mode,
      appliedConcept === 'all' ? null : appliedConcept,
    )
    setNodes(n as any)
    setEdges(e as any)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedChapter, appliedConcept, appliedDirection, registry, questionCounts, containerSize, mode])

  const appliedChapterName = appliedChapter ? registry[appliedChapter]?.chapter_name || '' : ''

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '16px' }}>
      Loading concept map...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? '248px' : '44px', minWidth: sidebarOpen ? '248px' : '44px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', transition: 'width 0.22s ease, min-width 0.22s ease', overflow: 'hidden', boxShadow: '1px 0 6px rgba(0,0,0,0.05)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', padding: sidebarOpen ? '14px 14px 10px' : '14px 0', borderBottom: '1px solid #f1f5f9' }}>
          {sidebarOpen && <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Filters</span>}
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '7px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '12px', flexShrink: 0 }}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {sidebarOpen && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

            {/* Navigation */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Navigate</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {([['🔥 Topic Heatmap', '/heatmap'], ['🧬 Find Ancestry', '/ancestry'], ['🗺 Concept Map', '/concept-map']] as const).map(([label, href]) => {
                  const isActive = href === '/concept-map'
                  return (
                    <button key={href} onClick={() => router.push(href)}
                      style={{ background: isActive ? '#f0fdf4' : 'transparent', border: `1.5px solid ${isActive ? '#16a34a' : '#e2e8f0'}`, borderRadius: '8px', padding: '8px 10px', textAlign: 'left', cursor: 'pointer', color: isActive ? '#14532d' : '#64748b', fontSize: '13px', fontWeight: isActive ? 600 : 400, fontFamily: 'inherit', transition: 'all 0.12s' }}>
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Subject */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Subject</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {(['Chemistry', 'Physics'] as Subject[]).map(s => {
                  const isActive = subject === s
                  const emoji = s === 'Chemistry' ? '⚗️' : '⚡'
                  return (
                    <button key={s} onClick={() => setSubject(s)}
                      style={{ background: isActive ? '#f8fafc' : 'transparent', border: `1.5px solid ${isActive ? '#0f172a' : '#e2e8f0'}`, borderRadius: '8px', padding: '8px 10px', textAlign: 'left', cursor: 'pointer', color: isActive ? '#0f172a' : '#64748b', fontSize: '13px', fontWeight: isActive ? 700 : 400, fontFamily: 'inherit', transition: 'all 0.12s' }}>
                      {emoji} {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Class */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Class</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[9, 10, 11, 12].map(cls => {
                  const colors = CLASS_COLORS[cls]
                  const isActive = pendingClass === cls
                  return (
                    <button key={cls} onClick={() => { setPendingClass(cls); setPendingChapter(null); setPendingConcept('all') }}
                      style={{ background: isActive ? colors.bg : 'transparent', border: `1.5px solid ${isActive ? colors.border : '#e2e8f0'}`, borderRadius: '8px', padding: '8px 10px', textAlign: 'left', cursor: 'pointer', color: isActive ? colors.text : '#64748b', fontSize: '13px', fontWeight: isActive ? 600 : 400, fontFamily: 'inherit', transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isActive ? colors.border : '#cbd5e1', flexShrink: 0 }} />
                      {CLASS_LABELS[cls]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Chapter */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Chapter</div>
              <select value={pendingChapter || ''} onChange={e => { setPendingChapter(e.target.value || null); setPendingConcept('all') }}
                style={{ width: '100%', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: pendingChapter ? '#374151' : '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                <option value=''>Select chapter...</option>
                {chaptersForClass.map(ch => (
                  <option key={ch.key} value={ch.key}>{ch.name}{ch.count > 0 ? ` (${ch.count}Q)` : ''}</option>
                ))}
              </select>
            </div>

            {/* Concept */}
            {pendingChapter && conceptsForChapter.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Concept</div>
                <select value={pendingConcept} onChange={e => setPendingConcept(e.target.value)}
                  style={{ width: '100%', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: '#374151', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                  <option value='all'>All concepts (chapter view)</option>
                  {conceptsForChapter.map(c => (
                    <option key={c.concept_id} value={c.concept_id}>{c.concept_name}{questionCounts[c.concept_id] ? ` (${questionCounts[c.concept_id]}Q)` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Direction */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Direction</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {([['ltr', '→ IX to XII'], ['rtl', '← XII to IX']] as const).map(([d, label]) => (
                  <button key={d} onClick={() => setPendingDirection(d)}
                    style={{ flex: 1, background: pendingDirection === d ? '#0f172a' : '#f8fafc', border: `1.5px solid ${pendingDirection === d ? '#0f172a' : '#e2e8f0'}`, borderRadius: '8px', padding: '7px 4px', color: pendingDirection === d ? 'white' : '#64748b', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.12s' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Go */}
            <button onClick={handleGo} disabled={!pendingChapter}
              style={{ background: pendingChapter ? '#2563eb' : '#e2e8f0', border: 'none', borderRadius: '10px', padding: '12px', color: pendingChapter ? 'white' : '#94a3b8', cursor: pendingChapter ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s', boxShadow: pendingChapter ? '0 4px 12px rgba(37,99,235,0.3)' : 'none' }}>
              Generate Map →
            </button>
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '11px 20px', borderBottom: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Concept Map</h1>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '1px 0 0' }}>
              {subject} · {appliedChapter
                ? `${appliedChapterName} › ${mode === 'chapter' ? 'Chapter dependencies' : (concepts.find(c => c.concept_id === appliedConcept)?.concept_name || '')}`
                : 'Select a chapter and click Generate Map'}
            </p>
          </div>
          {nodes.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', background: mode === 'chapter' ? '#eff6ff' : '#faf5ff', border: `1px solid ${mode === 'chapter' ? '#bfdbfe' : '#e9d5ff'}`, borderRadius: '6px', padding: '3px 10px', fontWeight: 600, color: mode === 'chapter' ? '#1d4ed8' : '#7e22ce' }}>
                {mode === 'chapter' ? '📚 Chapter view' : '💡 Concept view'}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3px 10px' }}>
                {nodes.length} chapters · {edges.length} links
              </div>
            </div>
          )}
        </div>

        <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
          {nodes.length === 0 ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <div style={{ fontSize: '52px', opacity: 0.12 }}>🗺</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#94a3b8' }}>
                {appliedChapter ? 'No chapter dependencies found' : 'Select a chapter and click Generate Map'}
              </div>
              {!appliedChapter && <div style={{ fontSize: '13px', color: '#cbd5e1' }}>Use the sidebar on the left</div>}
            </div>
          ) : (
            <ReactFlow
              nodes={nodes} edges={edges}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView fitViewOptions={{ padding: 0.08 }}
              minZoom={0.05} maxZoom={2}
              style={{ background: '#f8fafc' }}
            >
              <Background color="#e2e8f0" gap={28} size={1} />
              <Controls style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
            </ReactFlow>
          )}
        </div>
      </div>

      {/* Popups */}
      {chapterPopup && (
        <ChapterPopup
          chapter={chapterPopup}
          questionCounts={questionCounts}
          onClose={() => setChapterPopup(null)}
        />
      )}
      {morePopup && (
        <MoreConceptsPopup
          chapterName={morePopup.chapterName}
          classNum={morePopup.classNum}
          concepts={morePopup.concepts}
          onClose={() => setMorePopup(null)}
        />
      )}
    </div>
  )
}
