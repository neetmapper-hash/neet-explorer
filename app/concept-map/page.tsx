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
  verdict?: string
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
  verified_class?: number
  verified_chapter_number?: number
}

interface MappingData {
  mappings: Mapping[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASS_COLORS: Record<number, { bg: string; border: string; text: string; light: string }> = {
  9:  { bg: '#064e3b', border: '#10b981', text: '#6ee7b7', light: '#d1fae5' },
  10: { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd', light: '#dbeafe' },
  11: { bg: '#3b0764', border: '#a855f7', text: '#d8b4fe', light: '#f3e8ff' },
  12: { bg: '#7c2d12', border: '#f97316', text: '#fdba74', light: '#ffedd5' },
}

const CLASS_LABELS: Record<number, string> = {
  9: 'Class IX',
  10: 'Class X',
  11: 'Class XI',
  12: 'Class XII',
}

// ─── Custom Node ──────────────────────────────────────────────────────────────

function ConceptNode({ data }: { data: any }) {
  const colors = CLASS_COLORS[data.classNum]
  const isSelected = data.isSelected
  const questionCount = data.questionCount || 0

  return (
    <div
      onClick={() => data.onNodeClick(data)}
      style={{
        background: isSelected
          ? `linear-gradient(135deg, ${colors.border}33, ${colors.bg})`
          : colors.bg,
        border: `2px solid ${isSelected ? colors.border : colors.border + '66'}`,
        borderRadius: '12px',
        padding: '12px 16px',
        minWidth: '180px',
        maxWidth: '220px',
        cursor: 'pointer',
        boxShadow: isSelected
          ? `0 0 20px ${colors.border}66, 0 4px 12px rgba(0,0,0,0.4)`
          : '0 2px 8px rgba(0,0,0,0.3)',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
    >
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: colors.border,
          borderRadius: '50%',
          width: '16px',
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ color: 'white', fontSize: '10px' }}>★</span>
        </div>
      )}

      <div style={{
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: colors.text,
        marginBottom: '4px',
        textTransform: 'uppercase',
        opacity: 0.8,
      }}>
        {CLASS_LABELS[data.classNum]} · {data.chapterName}
      </div>

      <div style={{
        fontSize: '12px',
        fontWeight: 600,
        color: '#f1f5f9',
        lineHeight: 1.3,
        marginBottom: questionCount > 0 ? '8px' : 0,
      }}>
        {data.label}
      </div>

      {questionCount > 0 && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: colors.border + '33',
          border: `1px solid ${colors.border}66`,
          borderRadius: '20px',
          padding: '2px 8px',
          fontSize: '10px',
          color: colors.text,
          fontWeight: 600,
        }}>
          <span>📝</span>
          <span>{questionCount} NEET {questionCount === 1 ? 'question' : 'questions'}</span>
        </div>
      )}
    </div>
  )
}

const nodeTypes = { conceptNode: ConceptNode }

// ─── Tree Builder ─────────────────────────────────────────────────────────────

function buildTree(
  selectedConcepts: Concept[],
  allConcepts: Concept[],
  questionCounts: Record<string, number>,
  direction: 'top-down' | 'bottom-up',
  onNodeClick: (data: any) => void
): { nodes: Node[]; edges: Edge[] } {
  const conceptMap = new Map(allConcepts.map(c => [c.concept_id, c]))
  const selectedIds = new Set(selectedConcepts.map(c => c.concept_id))

  // Collect all nodes needed — traverse up (builds_upon) and down (reverse)
  const includedIds = new Set<string>()

  // Build reverse index for downward traversal
  const reverseIndex = new Map<string, string[]>()
  for (const c of allConcepts) {
    for (const parentId of c.builds_upon || []) {
      if (!reverseIndex.has(parentId)) reverseIndex.set(parentId, [])
      reverseIndex.get(parentId)!.push(c.concept_id)
    }
  }

  // Traverse upward from selected concepts (find prerequisites)
  function traverseUp(id: string, visited = new Set<string>()) {
    if (visited.has(id)) return
    visited.add(id)
    includedIds.add(id)
    const concept = conceptMap.get(id)
    if (!concept) return
    for (const parentId of concept.builds_upon || []) {
      traverseUp(parentId, visited)
    }
  }

  // Traverse downward from selected concepts (find what builds on them)
  function traverseDown(id: string, visited = new Set<string>()) {
    if (visited.has(id)) return
    visited.add(id)
    includedIds.add(id)
    const children = reverseIndex.get(id) || []
    for (const childId of children) {
      traverseDown(childId, visited)
    }
  }

  for (const concept of selectedConcepts) {
    traverseUp(concept.concept_id)
    traverseDown(concept.concept_id)
  }

  // Group by class for layout
  const byClass: Record<number, Concept[]> = { 9: [], 10: [], 11: [], 12: [] }
  for (const id of Array.from(includedIds)) {
    const c = conceptMap.get(id)
    if (c && byClass[c.class]) {
      byClass[c.class].push(c)
    }
  }

  // Layout constants
  const NODE_WIDTH = 220
  const NODE_HEIGHT = 100
  const H_GAP = 40
  const V_GAP = 120

  const classOrder = direction === 'top-down' ? [12, 11, 10, 9] : [9, 10, 11, 12]

  const nodes: Node[] = []
  // Assign positions level by level
  classOrder.forEach((classNum, levelIdx) => {
    const concepts = byClass[classNum] || []
    const totalWidth = concepts.length * (NODE_WIDTH + H_GAP) - H_GAP
    const startX = -totalWidth / 2
    const y = levelIdx * (NODE_HEIGHT + V_GAP)

    concepts.forEach((concept, idx) => {
      const x = startX + idx * (NODE_WIDTH + H_GAP)
      nodes.push({
        id: concept.concept_id,
        type: 'conceptNode',
        position: { x, y },
        data: {
          label: concept.concept_name,
          classNum: concept.class,
          chapterName: concept.chapter_name,
          summary: concept.summary,
          concept_id: concept.concept_id,
          isSelected: selectedIds.has(concept.concept_id),
          questionCount: questionCounts[concept.concept_id] || 0,
          onNodeClick,
        },
        sourcePosition: direction === 'top-down' ? Position.Bottom : Position.Top,
        targetPosition: direction === 'top-down' ? Position.Top : Position.Bottom,
      })
    })
  })

  // Build edges from builds_upon relationships
  const edges: Edge[] = []
  const edgeSet = new Set<string>()

  for (const id of Array.from(includedIds)) {
    const concept = conceptMap.get(id)
    if (!concept) continue
    for (const parentId of concept.builds_upon || []) {
      if (!includedIds.has(parentId)) continue
      const edgeKey = direction === 'top-down'
        ? `${id}-${parentId}`  // child → parent (top-down: parent is above)
        : `${parentId}-${id}`  // parent → child (bottom-up: parent is above)

      if (edgeSet.has(edgeKey)) continue
      edgeSet.add(edgeKey)

      const parentConcept = conceptMap.get(parentId)
      const colors = CLASS_COLORS[parentConcept?.class || 9]

      edges.push({
        id: `e-${id}-${parentId}`,
        source: direction === 'top-down' ? parentId : id,
        target: direction === 'top-down' ? id : parentId,
        type: 'smoothstep',
        animated: selectedIds.has(id) || selectedIds.has(parentId),
        style: {
          stroke: colors.border,
          strokeWidth: selectedIds.has(id) || selectedIds.has(parentId) ? 2 : 1,
          opacity: selectedIds.has(id) || selectedIds.has(parentId) ? 0.9 : 0.4,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: colors.border,
          width: 12,
          height: 12,
        },
      })
    }
  }

  return { nodes, edges }
}

// ─── Explanation Popup ────────────────────────────────────────────────────────

function ExplanationPopup({
  concept,
  onClose,
}: {
  concept: Concept & { questionCount: number }
  onClose: () => void
}) {
  const colors = CLASS_COLORS[concept.class]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }} onClick={onClose}>
      <div style={{
        background: '#0f172a',
        border: `2px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '28px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: `0 0 40px ${colors.border}44`,
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
        }}>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: colors.text,
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              {CLASS_LABELS[concept.class]} · {concept.chapter_name}
            </div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#f1f5f9',
              lineHeight: 1.3,
              margin: 0,
            }}>
              {concept.concept_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: '14px',
            }}
          >✕</button>
        </div>

        <p style={{
          fontSize: '14px',
          color: '#cbd5e1',
          lineHeight: 1.7,
          margin: '0 0 20px',
        }}>
          {concept.summary}
        </p>

        {concept.questionCount > 0 && (
          <div style={{
            background: colors.bg,
            border: `1px solid ${colors.border}44`,
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ fontSize: '20px' }}>📝</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>
                {concept.questionCount} NEET question{concept.questionCount !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                asked on this concept (2021–2025)
              </div>
            </div>
          </div>
        )}

        {concept.builds_upon?.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
              BUILDS UPON
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {concept.builds_upon.length} prerequisite concept{concept.builds_upon.length !== 1 ? 's' : ''}
            </div>
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
  const [selectedClass, setSelectedClass] = useState<number>(12)
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null)
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null)
  const [direction, setDirection] = useState<'top-down' | 'bottom-up'>('top-down')
  const [popupConcept, setPopupConcept] = useState<(Concept & { questionCount: number }) | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)

  // Load data
  useEffect(() => {
    async function load() {
      try {
        const [conceptsRes, mappingRes] = await Promise.all([
          fetch('/chemistry_concepts_new.json'),
          fetch('/chemistry_question_mapping.json'),
        ])
        const conceptsData: ConceptsData = await conceptsRes.json()
        const mappingData: MappingData = await mappingRes.json()

        // Build question counts per concept
        const counts: Record<string, number> = {}
        for (const m of mappingData.mappings) {
          if (m.concept_id && m.concept_id !== "NONE" && m.status !== "uncertain") {
            counts[m.concept_id] = (counts[m.concept_id] || 0) + 1
          }
        }

        setConcepts(conceptsData.concepts.filter(c => c.concept_name))
        setQuestionCounts(counts)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load data:', err)
        setLoading(false)
      }
    }
    load()
  }, [])

  // Get chapters for selected class
  const chaptersForClass = useMemo(() => {
    const chapterMap = new Map<string, { name: string; count: number; conceptCount: number }>()
    for (const c of concepts) {
      if (c.class !== selectedClass) continue
      const key = `${c.class}_${c.chapter_number}`
      if (!chapterMap.has(key)) {
        chapterMap.set(key, {
          name: c.chapter_name,
          count: 0,
          conceptCount: 0,
        })
      }
      const ch = chapterMap.get(key)!
      ch.conceptCount++
      ch.count += questionCounts[c.concept_id] || 0
    }
    return Array.from(chapterMap.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => {
        const numA = parseInt(a.key.split('_')[1])
        const numB = parseInt(b.key.split('_')[1])
        return numA - numB
      })
  }, [concepts, selectedClass, questionCounts])

  // Get concepts for selected chapter
  const conceptsForChapter = useMemo(() => {
    if (!selectedChapter) return []
    const [cls, chNum] = selectedChapter.split('_').map(Number)
    return concepts.filter(c => c.class === cls && c.chapter_number === chNum)
  }, [concepts, selectedChapter])

  // Handle node click
  const handleNodeClick = useCallback((data: any) => {
    const concept = concepts.find(c => c.concept_id === data.concept_id)
    if (!concept) return
    setPopupConcept({ ...concept, questionCount: questionCounts[data.concept_id] || 0 })
  }, [concepts, questionCounts])

  // Build tree when selection changes
  useEffect(() => {
    if (!selectedChapter && !selectedConcept) {
      setNodes([] as any)
      setEdges([] as any)
      return
    }

    let selectedConcepts: Concept[] = []

    if (selectedConcept) {
      const concept = concepts.find(c => c.concept_id === selectedConcept)
      if (concept) selectedConcepts = [concept]
    } else if (selectedChapter) {
      selectedConcepts = conceptsForChapter
    }

    if (selectedConcepts.length === 0) return

    const { nodes: newNodes, edges: newEdges } = buildTree(
      selectedConcepts,
      concepts,
      questionCounts,
      direction,
      handleNodeClick
    )
    setNodes(newNodes as any)
    setEdges(newEdges as any)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapter, selectedConcept, concepts, questionCounts, direction, handleNodeClick, conceptsForChapter])

  // Handle chapter selection
  const handleChapterSelect = (key: string) => {
    setSelectedChapter(key === selectedChapter ? null : key)
    setSelectedConcept(null)
  }

  // Handle concept selection
  const handleConceptSelect = (conceptId: string) => {
    setSelectedConcept(conceptId === selectedConcept ? null : conceptId)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#020817',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        fontFamily: 'monospace',
        fontSize: '14px',
      }}>
        Loading concept map...
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020817',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 28px',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#f1f5f9',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Concept Map
          </h1>
          <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0', }}>
            Chemistry · Select a chapter or concept to explore its ancestry chain
          </p>
        </div>

        {/* Direction toggle */}
        <button
          onClick={() => setDirection(d => d === 'top-down' ? 'bottom-up' : 'top-down')}
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '8px 16px',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'inherit',
          }}
        >
          <span>{direction === 'top-down' ? '⬇' : '⬆'}</span>
          <span>{direction === 'top-down' ? 'Class XII at top' : 'Class IX at top'}</span>
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel */}
        <div style={{
          width: '280px',
          minWidth: '280px',
          background: '#0a0f1e',
          borderRight: '1px solid #1e293b',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Class selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            padding: '16px',
            borderBottom: '1px solid #1e293b',
          }}>
            {[9, 10, 11, 12].map(cls => {
              const colors = CLASS_COLORS[cls]
              const isActive = selectedClass === cls
              return (
                <button
                  key={cls}
                  onClick={() => {
                    setSelectedClass(cls)
                    setSelectedChapter(null)
                    setSelectedConcept(null)
                  }}
                  style={{
                    background: isActive ? colors.bg : 'transparent',
                    border: `1px solid ${isActive ? colors.border : '#1e293b'}`,
                    borderRadius: '8px',
                    padding: '8px',
                    color: isActive ? colors.text : '#475569',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {CLASS_LABELS[cls]}
                </button>
              )
            })}
          </div>

          {/* Chapter list */}
          <div style={{ padding: '12px 0', flex: 1 }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#334155',
              padding: '0 16px 8px',
              textTransform: 'uppercase',
            }}>
              Chapters
            </div>

            {chaptersForClass.map(({ key, name, count, conceptCount }) => {
              const isActive = selectedChapter === key
              const colors = CLASS_COLORS[selectedClass]

              return (
                <div key={key}>
                  <button
                    onClick={() => handleChapterSelect(key)}
                    style={{
                      width: '100%',
                      background: isActive ? colors.bg + '88' : 'transparent',
                      border: 'none',
                      borderLeft: `3px solid ${isActive ? colors.border : 'transparent'}`,
                      padding: '10px 16px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: isActive ? '#f1f5f9' : '#94a3b8',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ lineHeight: 1.3 }}>{name}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                      {count > 0 && (
                        <span style={{
                          fontSize: '10px',
                          background: colors.border + '33',
                          color: colors.text,
                          borderRadius: '4px',
                          padding: '1px 5px',
                          fontWeight: 600,
                        }}>
                          {count}Q
                        </span>
                      )}
                      <span style={{ fontSize: '10px', color: '#334155' }}>
                        {conceptCount}c
                      </span>
                    </div>
                  </button>

                  {/* Concept list inside chapter */}
                  {isActive && conceptsForChapter.length > 0 && (
                    <div style={{
                      background: '#0d1424',
                      borderBottom: '1px solid #1e293b',
                    }}>
                      {conceptsForChapter.map(concept => {
                        const isConceptActive = selectedConcept === concept.concept_id
                        const qCount = questionCounts[concept.concept_id] || 0
                        return (
                          <button
                            key={concept.concept_id}
                            onClick={() => handleConceptSelect(concept.concept_id)}
                            style={{
                              width: '100%',
                              background: isConceptActive ? colors.bg : 'transparent',
                              border: 'none',
                              borderLeft: `3px solid ${isConceptActive ? colors.border : '#1e293b'}`,
                              padding: '8px 16px 8px 24px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              color: isConceptActive ? '#f1f5f9' : '#64748b',
                              fontSize: '12px',
                              fontFamily: 'inherit',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <span style={{ lineHeight: 1.3 }}>{concept.concept_name}</span>
                            {qCount > 0 && (
                              <span style={{
                                fontSize: '10px',
                                background: colors.border + '22',
                                color: colors.text,
                                borderRadius: '4px',
                                padding: '1px 5px',
                                fontWeight: 600,
                                flexShrink: 0,
                              }}>
                                {qCount}Q
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel — tree */}
        <div style={{ flex: 1, position: 'relative', background: '#020817' }}>
          {nodes.length === 0 ? (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1e293b',
              gap: '16px',
            }}>
              <div style={{ fontSize: '64px', opacity: 0.3 }}>🗺</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#334155' }}>
                Select a chapter to explore its concept map
              </div>
              <div style={{ fontSize: '13px', color: '#1e293b' }}>
                Then click a concept to highlight its ancestry chain
              </div>

              {/* Legend */}
              <div style={{
                display: 'flex',
                gap: '16px',
                marginTop: '24px',
                background: '#0a0f1e',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '16px 24px',
              }}>
                {[9, 10, 11, 12].map(cls => {
                  const colors = CLASS_COLORS[cls]
                  return (
                    <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        background: colors.bg,
                        border: `2px solid ${colors.border}`,
                      }} />
                      <span style={{ fontSize: '12px', color: '#475569' }}>{CLASS_LABELS[cls]}</span>
                    </div>
                  )
                })}
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
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.3}
              maxZoom={2}
              style={{ background: '#020817' }}
            >
              <Background color="#1e293b" gap={24} size={1} />
              <Controls
                style={{
                  background: '#0a0f1e',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                }}
              />
              <MiniMap
                style={{
                  background: '#0a0f1e',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                }}
                nodeColor={(node) => {
                  const data = node.data as { classNum?: number; isSelected?: boolean }
                  const colors = CLASS_COLORS[data?.classNum || 9]
                  return data?.isSelected ? colors.border : colors.bg
                }}
              />
            </ReactFlow>
          )}
        </div>
      </div>

      {/* Popup */}
      {popupConcept && (
        <ExplanationPopup
          concept={popupConcept}
          onClose={() => setPopupConcept(null)}
        />
      )}
    </div>
  )
}
