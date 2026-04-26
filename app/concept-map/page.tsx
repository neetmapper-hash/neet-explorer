'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
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

// ─── Custom Nodes WITH Handles ────────────────────────────────────────────────

function ConceptNode({ data }: { data: any }) {
  const colors = CLASS_COLORS[data.classNum] || CLASS_COLORS[9]
  const isSelected = data.isSelected

  return (
    <div style={{
      background: isSelected ? colors.border : colors.bg,
      border: `2.5px solid ${colors.border}`,
      borderRadius: '12px',
      padding: '16px 18px',
      width: '240px',
      cursor: 'pointer',
      boxShadow: isSelected
        ? `0 6px 20px ${colors.border}55`
        : `0 2px 10px ${colors.border}22`,
      position: 'relative',
    }}
    onClick={() => data.onNodeClick && data.onNodeClick(data)}
    >
      {/* Left handle — target (incoming edges) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: colors.border, width: 10, height: 10, border: `2px solid white` }}
      />

      <div style={{
        fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em',
        color: isSelected ? 'rgba(255,255,255,0.8)' : colors.border,
        marginBottom: '8px', textTransform: 'uppercase',
      }}>
        {CLASS_LABELS[data.classNum]}
      </div>

      <div style={{
        fontSize: '16px', fontWeight: 700,
        color: isSelected ? 'white' : colors.text,
        lineHeight: 1.4,
        marginBottom: data.questionCount > 0 ? '10px' : 0,
      }}>
        {data.label}
      </div>

      {data.questionCount > 0 && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: isSelected ? 'rgba(255,255,255,0.2)' : colors.tag,
          borderRadius: '20px', padding: '4px 10px',
          fontSize: '12px', color: isSelected ? 'white' : colors.tagText, fontWeight: 700,
        }}>
          📝 {data.questionCount}Q
        </div>
      )}

      {/* Right handle — source (outgoing edges) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: colors.border, width: 10, height: 10, border: `2px solid white` }}
      />
    </div>
  )
}

function ChapterNode({ data }: { data: any }) {
  const colors = CLASS_COLORS[data.classNum] || CLASS_COLORS[12]

  return (
    <div style={{
      background: colors.border,
      border: `3px solid ${colors.text}`,
      borderRadius: '14px',
      padding: '18px 22px',
      width: '260px',
      boxShadow: `0 6px 24px ${colors.border}66`,
      position: 'relative',
    }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: 'white', width: 10, height: 10, border: `2px solid ${colors.border}` }}
      />

      <div style={{
        fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.75)', marginBottom: '8px', textTransform: 'uppercase',
      }}>
        {CLASS_LABELS[data.classNum]} · {data.conceptCount} concepts
      </div>

      <div style={{
        fontSize: '18px', fontWeight: 800, color: 'white',
        lineHeight: 1.3, marginBottom: data.questionCount > 0 ? '10px' : 0,
      }}>
        {data.label}
      </div>

      {data.questionCount > 0 && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: 'rgba(255,255,255,0.2)', borderRadius: '20px',
          padding: '4px 10px', fontSize: '12px', color: 'white', fontWeight: 700,
        }}>
          📝 {data.questionCount}Q in NEET
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: 'white', width: 10, height: 10, border: `2px solid ${colors.border}` }}
      />
    </div>
  )
}

const nodeTypes = { conceptNode: ConceptNode, chapterNode: ChapterNode }

// ─── Tree Builder ─────────────────────────────────────────────────────────────

function buildTree(
  selectedConcepts: Concept[],
  allConcepts: Concept[],
  questionCounts: Record<string, number>,
  direction: 'ltr' | 'rtl',
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

  // Only direct children (one level down) — not recursive
  // This prevents Class 9 chapters pulling in unrelated Class 12 concepts
  // A concept shows as child only if it DIRECTLY builds_upon a selected concept
  function getDirectChildren(id: string): string[] {
    return reverseIndex.get(id) || []
  }

  for (const concept of selectedConcepts) {
    traverseUp(concept.concept_id)
    includedIds.add(concept.concept_id)
    // One level down only — direct children regardless of class
    for (const childId of getDirectChildren(concept.concept_id)) {
      includedIds.add(childId)
    }
  }

  const NODE_W = 240
  const NODE_H = 130
  const V_GAP = 40
  const H_GAP = 200

  const classOrderLTR = [9, 10, 11, 12]
  const classOrder = direction === 'ltr' ? classOrderLTR : [12, 11, 10, 9]

  const nodes: Node[] = []
  const edges: Edge[] = []
  const edgeSet = new Set<string>()

  const makeEdge = (fromId: string, toId: string, colorClass: number, highlighted = false) => {
    const key = `${fromId}→${toId}`
    if (edgeSet.has(key)) return
    edgeSet.add(key)
    const colors = CLASS_COLORS[colorClass] || CLASS_COLORS[9]
    edges.push({
      id: `e-${fromId}-${toId}`,
      source: fromId,
      target: toId,
      type: 'smoothstep',
      animated: highlighted,
      style: {
        stroke: colors.border,
        strokeWidth: highlighted ? 4 : 3,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: colors.border,
      },
    })
  }

  if (isAllMode) {
    const CHAPTER_ID = `chapter_${selectedClassNum}_sel`
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

    // X position per class column
    const classX: Record<number, number> = {}
    presentClasses.forEach((cls, idx) => { classX[cls] = idx * (NODE_W + H_GAP) })

    presentClasses.forEach(classNum => {
      const x = classX[classNum]

      if (classNum === selectedClassNum) {
        // Chapter node — centered vertically at y=0
        nodes.push({
          id: CHAPTER_ID,
          type: 'chapterNode',
          position: { x, y: 0 },
          data: {
            label: selectedChapterName,
            classNum: selectedClassNum,
            conceptCount: selectedConcepts.length,
            questionCount: chapterQCount,
          },
        })
      } else {
        const concepts = byClass[classNum] || []
        // Center the column vertically
        const totalHeight = concepts.length * NODE_H + (concepts.length - 1) * V_GAP
        const startY = -totalHeight / 2

        concepts.forEach((concept, idx) => {
          nodes.push({
            id: concept.concept_id,
            type: 'conceptNode',
            position: { x, y: startY + idx * (NODE_H + V_GAP) },
            data: {
              label: concept.concept_name,
              classNum: concept.class,
              chapterName: concept.chapter_name,
              summary: concept.summary,
              concept_id: concept.concept_id,
              isSelected: false,
              questionCount: questionCounts[concept.concept_id] || 0,
              onNodeClick,
            },
          })
        })
      }
    })

    // Edges: prereqs → chapter
    for (const selConcept of selectedConcepts) {
      for (const parentId of selConcept.builds_upon || []) {
        if (!includedIds.has(parentId) || selectedIds.has(parentId)) continue
        const pc = conceptMap.get(parentId)
        makeEdge(parentId, CHAPTER_ID, pc?.class || 9, true)
      }
    }

    // Edges: chapter → descendants + between non-selected
    for (const id of Array.from(includedIds)) {
      if (selectedIds.has(id)) continue
      const concept = conceptMap.get(id)
      if (!concept) continue
      for (const parentId of concept.builds_upon || []) {
        if (selectedIds.has(parentId)) {
          makeEdge(CHAPTER_ID, id, selectedClassNum, true)
        } else if (includedIds.has(parentId) && !selectedIds.has(parentId)) {
          const pc = conceptMap.get(parentId)
          makeEdge(parentId, id, pc?.class || 9)
        }
      }
    }

  } else {
    // Single concept mode
    const byClass: Record<number, Concept[]> = { 9: [], 10: [], 11: [], 12: [] }
    for (const id of Array.from(includedIds)) {
      const c = conceptMap.get(id)
      if (c && byClass[c.class] !== undefined) byClass[c.class].push(c)
    }

    const presentClasses = classOrder.filter(cls => byClass[cls] && byClass[cls].length > 0)
    const classX: Record<number, number> = {}
    presentClasses.forEach((cls, idx) => { classX[cls] = idx * (NODE_W + H_GAP) })

    presentClasses.forEach(classNum => {
      const concepts = byClass[classNum] || []
      const x = classX[classNum]
      const totalHeight = concepts.length * NODE_H + (concepts.length - 1) * V_GAP
      const startY = -totalHeight / 2

      concepts.forEach((concept, idx) => {
        const isSel = selectedIds.has(concept.concept_id)
        nodes.push({
          id: concept.concept_id,
          type: 'conceptNode',
          position: { x, y: startY + idx * (NODE_H + V_GAP) },
          data: {
            label: concept.concept_name,
            classNum: concept.class,
            chapterName: concept.chapter_name,
            summary: concept.summary,
            concept_id: concept.concept_id,
            isSelected: isSel,
            questionCount: questionCounts[concept.concept_id] || 0,
            onNodeClick,
          },
        })
      })
    })

    for (const id of Array.from(includedIds)) {
      const concept = conceptMap.get(id)
      if (!concept) continue
      for (const parentId of concept.builds_upon || []) {
        if (!includedIds.has(parentId)) continue
        const pc = conceptMap.get(parentId)
        const highlighted = selectedIds.has(id) || selectedIds.has(parentId)
        makeEdge(parentId, id, pc?.class || 9, highlighted)
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
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [pendingClass, setPendingClass] = useState<number>(12)
  const [pendingChapter, setPendingChapter] = useState<string | null>(null)
  const [pendingConcept, setPendingConcept] = useState<string>('all')
  const [pendingDirection, setPendingDirection] = useState<'ltr' | 'rtl'>('ltr')

  const [appliedClass, setAppliedClass] = useState<number | null>(null)
  const [appliedChapter, setAppliedChapter] = useState<string | null>(null)
  const [appliedConcept, setAppliedConcept] = useState<string>('all')
  const [appliedDirection, setAppliedDirection] = useState<'ltr' | 'rtl'>('ltr')

  const [popupConcept, setPopupConcept] = useState<(Concept & { questionCount: number }) | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

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

  const conceptsForChapter = useMemo(() => {
    if (!pendingChapter) return []
    const [cls, chNum] = pendingChapter.split('_').map(Number)
    return concepts.filter(c => c.class === cls && c.chapter_number === chNum)
  }, [concepts, pendingChapter])

  const appliedConceptsForChapter = useMemo(() => {
    if (!appliedChapter) return []
    const [cls, chNum] = appliedChapter.split('_').map(Number)
    return concepts.filter(c => c.class === cls && c.chapter_number === chNum)
  }, [concepts, appliedChapter])

  const appliedChapterName = useMemo(() => {
    if (!appliedChapter) return ''
    const c = concepts.find(c => `${c.class}_${c.chapter_number}` === appliedChapter)
    return c?.chapter_name || ''
  }, [concepts, appliedChapter])

  const handleNodeClick = useCallback((data: any) => {
    const concept = concepts.find(c => c.concept_id === data.concept_id)
    if (!concept) return
    setPopupConcept({ ...concept, questionCount: questionCounts[data.concept_id] || 0 })
  }, [concepts, questionCounts])

  const handleGo = useCallback(() => {
    if (!pendingChapter) return
    setAppliedClass(pendingClass)
    setAppliedChapter(pendingChapter)
    setAppliedConcept(pendingConcept)
    setAppliedDirection(pendingDirection)
  }, [pendingClass, pendingChapter, pendingConcept, pendingDirection])

  useEffect(() => {
    if (!appliedChapter || appliedConceptsForChapter.length === 0 || appliedClass === null) {
      setNodes([] as any); setEdges([] as any); return
    }
    const isAllMode = appliedConcept === 'all'
    const selConcepts = isAllMode
      ? appliedConceptsForChapter
      : appliedConceptsForChapter.filter(c => c.concept_id === appliedConcept)
    if (selConcepts.length === 0) return
    const { nodes: n, edges: e } = buildTree(
      selConcepts, concepts, questionCounts, appliedDirection,
      handleNodeClick, isAllMode, appliedChapterName, appliedClass,
    )
    setNodes(n as any)
    setEdges(e as any)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedChapter, appliedConcept, appliedDirection, appliedClass, concepts, questionCounts, appliedConceptsForChapter, appliedChapterName])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '16px' }}>
      Loading concept map...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '248px' : '44px',
        minWidth: sidebarOpen ? '248px' : '44px',
        background: 'white',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.22s ease, min-width 0.22s ease',
        overflow: 'hidden',
        boxShadow: '1px 0 6px rgba(0,0,0,0.05)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', padding: sidebarOpen ? '14px 14px 10px' : '14px 0', borderBottom: '1px solid #f1f5f9' }}>
          {sidebarOpen && <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Filters</span>}
          <button onClick={() => setSidebarOpen(o => !o)}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '7px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '12px', flexShrink: 0 }}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {sidebarOpen && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

            {/* Class */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Class</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[9, 10, 11, 12].map(cls => {
                  const colors = CLASS_COLORS[cls]
                  const isActive = pendingClass === cls
                  return (
                    <button key={cls}
                      onClick={() => { setPendingClass(cls); setPendingChapter(null); setPendingConcept('all') }}
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
                  <option value='all'>All concepts</option>
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
        <div style={{ padding: '11px 20px', borderBottom: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Concept Map</h1>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '1px 0 0' }}>
              Chemistry · {appliedChapter ? `${appliedChapterName} › ${appliedConcept !== 'all' ? (concepts.find(c => c.concept_id === appliedConcept)?.concept_name || '') : 'All concepts'}` : 'Select a chapter and click Generate Map'}
            </p>
          </div>
          {nodes.length > 0 && (
            <div style={{ fontSize: '12px', color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px' }}>
              {nodes.length} nodes · {edges.length} connections
            </div>
          )}
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          {nodes.length === 0 ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <div style={{ fontSize: '52px', opacity: 0.12 }}>🗺</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#94a3b8' }}>
                {appliedChapter ? 'No concept chain found' : 'Select a chapter and click Generate Map'}
              </div>
              {!appliedChapter && <div style={{ fontSize: '13px', color: '#cbd5e1' }}>Use the sidebar on the left</div>}
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              minZoom={0.1}
              maxZoom={2}
              style={{ background: '#f8fafc' }}
            >
              <Background color="#e2e8f0" gap={28} size={1} />
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
