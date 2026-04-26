'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
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

interface ConceptsData {
  subject: string
  concepts: Concept[]
}

interface Mapping {
  year: number
  question_number: number
  concept_id: string | null
  status: string
}

interface MappingData {
  mappings: Mapping[]
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const CLASS_COLORS: Record<number, { bg: string; border: string; text: string; tag: string; tagText: string }> = {
  9:  { bg: '#f0fdf4', border: '#16a34a', text: '#14532d', tag: '#dcfce7', tagText: '#166534' },
  10: { bg: '#eff6ff', border: '#2563eb', text: '#1e3a8a', tag: '#dbeafe', tagText: '#1d4ed8' },
  11: { bg: '#faf5ff', border: '#9333ea', text: '#581c87', tag: '#f3e8ff', tagText: '#7e22ce' },
  12: { bg: '#fff7ed', border: '#ea580c', text: '#7c2d12', tag: '#ffedd5', tagText: '#c2410c' },
}

const CLASS_LABELS: Record<number, string> = {
  9: 'Class IX', 10: 'Class X', 11: 'Class XI', 12: 'Class XII',
}

// ─── Custom Nodes ─────────────────────────────────────────────────────────────

function ConceptNode({ data }: { data: any }) {
  const colors = CLASS_COLORS[data.classNum]
  const isSelected = data.isSelected
  return (
    <div
      onClick={() => data.onNodeClick && data.onNodeClick(data)}
      style={{
        background: isSelected ? colors.border : colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: '10px',
        padding: '10px 14px',
        minWidth: '170px',
        maxWidth: '210px',
        cursor: 'pointer',
        boxShadow: isSelected ? `0 4px 16px ${colors.border}55` : '0 1px 4px rgba(0,0,0,0.10)',
        transition: 'all 0.18s ease',
      }}
    >
      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: isSelected ? 'white' : colors.border, marginBottom: '4px', textTransform: 'uppercase' }}>
        {CLASS_LABELS[data.classNum]}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? 'white' : colors.text, lineHeight: 1.3, marginBottom: data.questionCount > 0 ? '7px' : 0 }}>
        {data.label}
      </div>
      {data.questionCount > 0 && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: isSelected ? 'rgba(255,255,255,0.25)' : colors.tag, borderRadius: '20px', padding: '2px 7px', fontSize: '10px', color: isSelected ? 'white' : colors.tagText, fontWeight: 600 }}>
          📝 {data.questionCount}Q
        </div>
      )}
    </div>
  )
}

function ChapterNode({ data }: { data: any }) {
  const colors = CLASS_COLORS[data.classNum]
  return (
    <div style={{ background: colors.bg, border: `2.5px solid ${colors.border}`, borderRadius: '12px', padding: '12px 18px', minWidth: '200px', maxWidth: '260px', boxShadow: `0 2px 8px ${colors.border}33` }}>
      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: colors.border, marginBottom: '4px', textTransform: 'uppercase' }}>
        {CLASS_LABELS[data.classNum]} · {data.conceptCount} concepts
      </div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: colors.text, lineHeight: 1.3, marginBottom: data.questionCount > 0 ? '8px' : 0 }}>
        {data.label}
      </div>
      {data.questionCount > 0 && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: colors.tag, borderRadius: '20px', padding: '2px 8px', fontSize: '10px', color: colors.tagText, fontWeight: 600 }}>
          📝 {data.questionCount}Q in NEET
        </div>
      )}
    </div>
  )
}

const nodeTypes = { conceptNode: ConceptNode, chapterNode: ChapterNode }

// ─── Tree Builder ─────────────────────────────────────────────────────────────

function buildTree(
  selectedConcepts: Concept[],
  allConcepts: Concept[],
  questionCounts: Record<string, number>,
  direction: 'top-down' | 'bottom-up',
  onNodeClick: (data: any) => void,
  isAllMode: boolean,
  selectedChapterName: string,
  selectedClassNum: number,
): { nodes: Node[]; edges: Edge[] } {
  const conceptMap = new Map(allConcepts.map(c => [c.concept_id, c]))
  const selectedIds = new Set(selectedConcepts.map(c => c.concept_id))
  const includedIds = new Set<string>()

  const reverseIndex = new Map<string, string[]>()
  for (const c of allConcepts) {
    for (const parentId of c.builds_upon || []) {
      if (!reverseIndex.has(parentId)) reverseIndex.set(parentId, [])
      reverseIndex.get(parentId)!.push(c.concept_id)
    }
  }

  function traverseUp(id: string, visited = new Set<string>()) {
    if (visited.has(id)) return
    visited.add(id); includedIds.add(id)
    const concept = conceptMap.get(id)
    if (!concept) return
    for (const parentId of concept.builds_upon || []) traverseUp(parentId, visited)
  }

  function traverseDown(id: string, visited = new Set<string>()) {
    if (visited.has(id)) return
    visited.add(id); includedIds.add(id)
    for (const childId of (reverseIndex.get(id) || [])) traverseDown(childId, visited)
  }

  for (const concept of selectedConcepts) {
    traverseUp(concept.concept_id)
    traverseDown(concept.concept_id)
  }

  const NODE_W = 210, NODE_H = 90, H_GAP = 48, V_GAP = 110
  const classOrder = direction === 'top-down' ? [12, 11, 10, 9] : [9, 10, 11, 12]
  const nodes: Node[] = []
  const edges: Edge[] = []
  const edgeSet = new Set<string>()

  const makeEdge = (from: string, to: string, classNum: number, animated = false) => {
    const key = `${from}->${to}`
    if (edgeSet.has(key)) return
    edgeSet.add(key)
    const colors = CLASS_COLORS[classNum]
    edges.push({
      id: `e-${from}-${to}`,
      source: direction === 'top-down' ? from : to,
      target: direction === 'top-down' ? to : from,
      type: 'smoothstep',
      animated,
      style: { stroke: colors.border, strokeWidth: animated ? 2.5 : 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: colors.border, width: 14, height: 14 },
    })
  }

  if (isAllMode) {
    const CHAPTER_ID = `chapter_${selectedClassNum}_selected`
    const chapterQCount = selectedConcepts.reduce((s, c) => s + (questionCounts[c.concept_id] || 0), 0)

    const byClass: Record<number, Concept[]> = { 9: [], 10: [], 11: [], 12: [] }
    for (const id of Array.from(includedIds)) {
      if (selectedIds.has(id)) continue
      const c = conceptMap.get(id)
      if (c && byClass[c.class] !== undefined) byClass[c.class].push(c)
    }

    const presentClasses = classOrder.filter(cls =>
      cls === selectedClassNum || (byClass[cls] && byClass[cls].length > 0)
    )

    presentClasses.forEach((classNum, levelIdx) => {
      const y = levelIdx * (NODE_H + V_GAP)
      if (classNum === selectedClassNum) {
        nodes.push({
          id: CHAPTER_ID, type: 'chapterNode',
          position: { x: 0, y },
          data: { label: selectedChapterName, classNum: selectedClassNum, conceptCount: selectedConcepts.length, questionCount: chapterQCount },
          sourcePosition: direction === 'top-down' ? Position.Bottom : Position.Top,
          targetPosition: direction === 'top-down' ? Position.Top : Position.Bottom,
        })
      } else {
        const concepts = byClass[classNum] || []
        const totalW = concepts.length * (NODE_W + H_GAP) - H_GAP
        const startX = -totalW / 2
        concepts.forEach((concept, idx) => {
          nodes.push({
            id: concept.concept_id, type: 'conceptNode',
            position: { x: startX + idx * (NODE_W + H_GAP), y },
            data: { label: concept.concept_name, classNum: concept.class, chapterName: concept.chapter_name, summary: concept.summary, concept_id: concept.concept_id, isSelected: false, questionCount: questionCounts[concept.concept_id] || 0, onNodeClick },
            sourcePosition: direction === 'top-down' ? Position.Bottom : Position.Top,
            targetPosition: direction === 'top-down' ? Position.Top : Position.Bottom,
          })
        })
      }
    })

    for (const selConcept of selectedConcepts) {
      for (const parentId of selConcept.builds_upon || []) {
        if (!includedIds.has(parentId) || selectedIds.has(parentId)) continue
        const pc = conceptMap.get(parentId)
        makeEdge(parentId, CHAPTER_ID, pc?.class || 9)
      }
    }
    for (const id of Array.from(includedIds)) {
      if (selectedIds.has(id)) continue
      const concept = conceptMap.get(id)
      if (!concept) continue
      for (const parentId of concept.builds_upon || []) {
        if (selectedIds.has(parentId)) {
          makeEdge(CHAPTER_ID, id, selectedClassNum)
        } else if (includedIds.has(parentId) && !selectedIds.has(parentId)) {
          const pc = conceptMap.get(parentId)
          makeEdge(parentId, id, pc?.class || 9)
        }
      }
    }
  } else {
    const byClass: Record<number, Concept[]> = { 9: [], 10: [], 11: [], 12: [] }
    for (const id of Array.from(includedIds)) {
      const c = conceptMap.get(id)
      if (c && byClass[c.class] !== undefined) byClass[c.class].push(c)
    }
    const presentClasses = classOrder.filter(cls => byClass[cls] && byClass[cls].length > 0)
    presentClasses.forEach((classNum, levelIdx) => {
      const concepts = byClass[classNum] || []
      const totalW = concepts.length * (NODE_W + H_GAP) - H_GAP
      const startX = -totalW / 2
      const y = levelIdx * (NODE_H + V_GAP)
      concepts.forEach((concept, idx) => {
        nodes.push({
          id: concept.concept_id, type: 'conceptNode',
          position: { x: startX + idx * (NODE_W + H_GAP), y },
          data: { label: concept.concept_name, classNum: concept.class, chapterName: concept.chapter_name, summary: concept.summary, concept_id: concept.concept_id, isSelected: selectedIds.has(concept.concept_id), questionCount: questionCounts[concept.concept_id] || 0, onNodeClick },
          sourcePosition: direction === 'top-down' ? Position.Bottom : Position.Top,
          targetPosition: direction === 'top-down' ? Position.Top : Position.Bottom,
        })
      })
    })
    for (const id of Array.from(includedIds)) {
      const concept = conceptMap.get(id)
      if (!concept) continue
      for (const parentId of concept.builds_upon || []) {
        if (!includedIds.has(parentId)) continue
        const pc = conceptMap.get(parentId)
        makeEdge(parentId, id, pc?.class || 9, selectedIds.has(id) || selectedIds.has(parentId))
      }
    }
  }

  return { nodes, edges }
}

// ─── Popup ────────────────────────────────────────────────────────────────────

function ExplanationPopup({ concept, onClose }: { concept: Concept & { questionCount: number }; onClose: () => void }) {
  const colors = CLASS_COLORS[concept.class]
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: 'white', border: `2px solid ${colors.border}`, borderRadius: '16px', padding: '28px', maxWidth: '520px', width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: colors.border, textTransform: 'uppercase', marginBottom: '6px' }}>{CLASS_LABELS[concept.class]} · {concept.chapter_name}</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.3, margin: 0 }}>{concept.concept_name}</h2>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', color: '#6b7280', cursor: 'pointer', padding: '6px 10px', fontSize: '14px' }}>✕</button>
        </div>
        <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7, margin: '0 0 20px' }}>{concept.summary}</p>
        {concept.questionCount > 0 && (
          <div style={{ background: colors.tag, border: `1px solid ${colors.border}44`, borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📝</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: colors.tagText }}>{concept.questionCount} NEET question{concept.questionCount !== 1 ? 's' : ''}</div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>asked on this concept (2021–2025)</div>
            </div>
          </div>
        )}
        {concept.builds_upon?.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>BUILDS UPON</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{concept.builds_upon.length} prerequisite concept{concept.builds_upon.length !== 1 ? 's' : ''}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConceptMapPage() {
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Selections (pending — not applied until Go)
  const [pendingClass, setPendingClass] = useState<number>(12)
  const [pendingChapter, setPendingChapter] = useState<string | null>(null)
  const [pendingConcept, setPendingConcept] = useState<string>('all')
  const [pendingDirection, setPendingDirection] = useState<'top-down' | 'bottom-up'>('top-down')

  // Applied (what the tree actually shows)
  const [appliedClass, setAppliedClass] = useState<number | null>(null)
  const [appliedChapter, setAppliedChapter] = useState<string | null>(null)
  const [appliedConcept, setAppliedConcept] = useState<string>('all')
  const [appliedDirection, setAppliedDirection] = useState<'top-down' | 'bottom-up'>('top-down')

  const [popupConcept, setPopupConcept] = useState<(Concept & { questionCount: number }) | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Load data
  useEffect(() => {
    async function load() {
      try {
        const [cRes, mRes] = await Promise.all([
          fetch('/chemistry_concepts_new.json'),
          fetch('/chemistry_question_mapping.json'),
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
        console.error(err)
        setLoading(false)
      }
    }
    load()
  }, [])

  // Chapters for pending class
  const chaptersForClass = useMemo(() => {
    const map = new Map<string, { name: string; count: number; conceptCount: number }>()
    for (const c of concepts) {
      if (c.class !== pendingClass) continue
      const key = `${c.class}_${c.chapter_number}`
      if (!map.has(key)) map.set(key, { name: c.chapter_name, count: 0, conceptCount: 0 })
      const ch = map.get(key)!
      ch.conceptCount++
      ch.count += questionCounts[c.concept_id] || 0
    }
    return Array.from(map.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => parseInt(a.key.split('_')[1]) - parseInt(b.key.split('_')[1]))
  }, [concepts, pendingClass, questionCounts])

  // Concepts for pending chapter
  const conceptsForChapter = useMemo(() => {
    if (!pendingChapter) return []
    const [cls, chNum] = pendingChapter.split('_').map(Number)
    return concepts.filter(c => c.class === cls && c.chapter_number === chNum)
  }, [concepts, pendingChapter])

  // Chapter name for pending chapter
  const pendingChapterName = useMemo(() =>
    chaptersForClass.find(c => c.key === pendingChapter)?.name || '',
    [chaptersForClass, pendingChapter]
  )

  // Concepts for applied chapter (used when building tree)
  const appliedConceptsForChapter = useMemo(() => {
    if (!appliedChapter) return []
    const [cls, chNum] = appliedChapter.split('_').map(Number)
    return concepts.filter(c => c.class === cls && c.chapter_number === chNum)
  }, [concepts, appliedChapter])

  // Applied chapter name
  const appliedChapterName = useMemo(() => {
    if (!appliedChapter || appliedClass === null) return ''
    const map = new Map<string, string>()
    for (const c of concepts) {
      const key = `${c.class}_${c.chapter_number}`
      if (!map.has(key)) map.set(key, c.chapter_name)
    }
    return map.get(appliedChapter) || ''
  }, [concepts, appliedChapter, appliedClass])

  const handleNodeClick = useCallback((data: any) => {
    const concept = concepts.find(c => c.concept_id === data.concept_id)
    if (!concept) return
    setPopupConcept({ ...concept, questionCount: questionCounts[data.concept_id] || 0 })
  }, [concepts, questionCounts])

  // Go button handler — apply selections and build tree
  const handleGo = useCallback(() => {
    if (!pendingChapter) return

    setAppliedClass(pendingClass)
    setAppliedChapter(pendingChapter)
    setAppliedConcept(pendingConcept)
    setAppliedDirection(pendingDirection)
  }, [pendingClass, pendingChapter, pendingConcept, pendingDirection])

  // Build tree when applied values change
  useEffect(() => {
    if (!appliedChapter || appliedConceptsForChapter.length === 0 || appliedClass === null) {
      setNodes([] as any)
      setEdges([] as any)
      return
    }

    const isAllMode = appliedConcept === 'all'
    const selConcepts = isAllMode
      ? appliedConceptsForChapter
      : appliedConceptsForChapter.filter(c => c.concept_id === appliedConcept)

    if (selConcepts.length === 0) return

    const { nodes: n, edges: e } = buildTree(
      selConcepts,
      concepts,
      questionCounts,
      appliedDirection,
      handleNodeClick,
      isAllMode,
      appliedChapterName,
      appliedClass,
    )
    setNodes(n as any)
    setEdges(e as any)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedChapter, appliedConcept, appliedDirection, appliedClass, concepts, questionCounts, appliedConceptsForChapter, appliedChapterName])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px' }}>
        Loading concept map...
      </div>
    )
  }

  const SIDEBAR_WIDTH = 240

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? `${SIDEBAR_WIDTH}px` : '48px',
        minWidth: sidebarOpen ? `${SIDEBAR_WIDTH}px` : '48px',
        background: 'white',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease, min-width 0.25s ease',
        overflow: 'hidden',
        boxShadow: '1px 0 4px rgba(0,0,0,0.04)',
        position: 'relative',
        zIndex: 10,
      }}>

        {/* Toggle button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', padding: sidebarOpen ? '16px 16px 12px' : '16px 0', borderBottom: '1px solid #f1f5f9' }}>
          {sidebarOpen && (
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Filters
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '7px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '14px',
              flexShrink: 0,
            }}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Sidebar content — only visible when open */}
        {sidebarOpen && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Class selector */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
                Class
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[9, 10, 11, 12].map(cls => {
                  const colors = CLASS_COLORS[cls]
                  const isActive = pendingClass === cls
                  return (
                    <button
                      key={cls}
                      onClick={() => {
                        setPendingClass(cls)
                        setPendingChapter(null)
                        setPendingConcept('all')
                      }}
                      style={{
                        background: isActive ? colors.bg : 'transparent',
                        border: `1.5px solid ${isActive ? colors.border : '#e2e8f0'}`,
                        borderRadius: '8px',
                        padding: '8px 12px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: isActive ? colors.text : '#64748b',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 400,
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: isActive ? colors.border : '#cbd5e1',
                        flexShrink: 0,
                        transition: 'background 0.15s',
                      }} />
                      {CLASS_LABELS[cls]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Chapter selector */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
                Chapter
              </div>
              <select
                value={pendingChapter || ''}
                onChange={e => {
                  setPendingChapter(e.target.value || null)
                  setPendingConcept('all')
                }}
                style={{
                  width: '100%',
                  background: 'white',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '12px',
                  color: pendingChapter ? '#374151' : '#94a3b8',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              >
                <option value=''>Select chapter...</option>
                {chaptersForClass.map(ch => (
                  <option key={ch.key} value={ch.key}>
                    {ch.name}{ch.count > 0 ? ` (${ch.count}Q)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Concept selector — only when chapter selected */}
            {pendingChapter && conceptsForChapter.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Concept
                </div>
                <select
                  value={pendingConcept}
                  onChange={e => setPendingConcept(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'white',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    color: '#374151',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                >
                  <option value='all'>All concepts</option>
                  {conceptsForChapter.map(c => (
                    <option key={c.concept_id} value={c.concept_id}>
                      {c.concept_name}{questionCounts[c.concept_id] ? ` (${questionCounts[c.concept_id]}Q)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Direction toggle */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
                Direction
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['top-down', 'bottom-up'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setPendingDirection(d)}
                    style={{
                      flex: 1,
                      background: pendingDirection === d ? '#0f172a' : '#f8fafc',
                      border: `1.5px solid ${pendingDirection === d ? '#0f172a' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      padding: '7px 6px',
                      color: pendingDirection === d ? 'white' : '#64748b',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                  >
                    {d === 'top-down' ? '⬇ XII→IX' : '⬆ IX→XII'}
                  </button>
                ))}
              </div>
            </div>

            {/* Go button */}
            <button
              onClick={handleGo}
              disabled={!pendingChapter}
              style={{
                background: pendingChapter ? '#2563eb' : '#e2e8f0',
                border: 'none',
                borderRadius: '10px',
                padding: '11px',
                color: pendingChapter ? 'white' : '#94a3b8',
                cursor: pendingChapter ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 700,
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                letterSpacing: '0.02em',
              }}
            >
              Generate Map →
            </button>

          </div>
        )}
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Concept Map</h1>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '1px 0 0' }}>
              Chemistry · {appliedChapter ? `${appliedChapterName}${appliedConcept !== 'all' ? ` › ${concepts.find(c => c.concept_id === appliedConcept)?.concept_name || ''}` : ' › All concepts'}` : 'Select a chapter to begin'}
            </p>
          </div>
          {nodes.length > 0 && (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {nodes.length} nodes · {edges.length} connections
            </div>
          )}
        </div>

        {/* Tree area */}
        <div style={{ flex: 1, position: 'relative' }}>
          {nodes.length === 0 ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <div style={{ fontSize: '48px', opacity: 0.15 }}>🗺</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#94a3b8' }}>
                {appliedChapter ? 'No concept chain found for this selection' : 'Select a chapter and click Generate Map'}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                {!appliedChapter && 'Use the sidebar to choose class, chapter and concept'}
              </div>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              minZoom={0.2}
              maxZoom={2}
              style={{ background: '#f8fafc' }}
            >
              <Background color="#e2e8f0" gap={24} size={1} />
              <Controls style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <MiniMap
                style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                nodeColor={(node) => {
                  const d = node.data as { classNum?: number; isSelected?: boolean }
                  const colors = CLASS_COLORS[d?.classNum || 9]
                  return d?.isSelected ? colors.border : colors.bg
                }}
              />
            </ReactFlow>
          )}
        </div>
      </div>

      {popupConcept && <ExplanationPopup concept={popupConcept} onClose={() => setPopupConcept(null)} />}
    </div>
  )
}
