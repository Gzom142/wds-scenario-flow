import { useCallback, useEffect, useMemo, useState } from 'react'
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import Filter from './components/Filter.jsx'
import SidePanel from './components/SidePanel.jsx'
import StoryNode from './components/StoryNode.jsx'
import { availableCharacters, initialEdges, initialNodes, troupes } from './data/storyData.js'

const nodeTypes = { story: StoryNode }
const emptyFilter = { troupeId: '', characterId: '' }

function FlowCanvas({ nodes, edges, onSelect }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    const frame = requestAnimationFrame(() => fitView({ padding: 0.22, duration: 260, maxZoom: 1 }))
    return () => cancelAnimationFrame(frame)
  }, [nodes, fitView])
  return <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={(_, node) => onSelect(node)} fitView fitViewOptions={{ padding: 0.22, maxZoom: 1 }} nodesDraggable={false} nodesConnectable={false} elementsSelectable>
    <Background gap={24} size={1} color="#ded9e8" />
    <Controls showInteractive={false} />
    <MiniMap pannable zoomable nodeColor={(node) => node.data?.troupe?.color ?? '#817a91'} />
  </ReactFlow>
}

export default function App() {
  const [draft, setDraft] = useState(emptyFilter)
  const [filter, setFilter] = useState(emptyFilter)
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  const { nodes, edges } = useMemo(() => {
    const matches = (node) => (
      (!filter.troupeId || node.data.troupeIds.some((id) => String(id) === filter.troupeId)) &&
      (!filter.characterId || node.data.characterIds.some((id) => String(id) === filter.characterId))
    )
    const nextNodes = initialNodes.filter(matches)
    const ids = new Set(nextNodes.map((node) => node.id))
    const nextEdges = initialEdges.filter((edge) => (
      ids.has(edge.source) &&
      ids.has(edge.target) &&
      (!filter.troupeId || edge.data.troupeIds.some((id) => String(id) === filter.troupeId))
    ))
    return { nodes: nextNodes, edges: nextEdges }
  }, [filter, initialNodes, initialEdges])

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null
  const selectNode = useCallback((node) => setSelectedNodeId(node.id), [])
  const apply = () => { setFilter(draft); setSelectedNodeId(null) }
  const reset = () => { setDraft(emptyFilter); setFilter(emptyFilter); setSelectedNodeId(null) }

  return <main className="app-shell">
    <p className="data-notice" role="status">現時点で各データは未入力の部分があります</p>
    <header className="app-header">
      <div><p className="site-kicker">WORLD DAI STAR</p><h1>ストーリーライン</h1></div>
      <p className="fan-notice">
        <strong>非公式ファンメイド（二次創作）</strong>
        <span>公式・関係各社とは関係ありません。劇団ごとの物語とイベントをたどる個人用ビューアです。</span>
        <a href="https://world-dai-star.com/news/1947" target="_blank" rel="noreferrer">二次創作ガイドライン</a>
      </p>
    </header>
    <Filter draft={draft} onChange={setDraft} onApply={apply} onReset={reset} troupes={troupes} characters={availableCharacters} />
    <ReactFlowProvider>
      <section className="workspace" aria-label="ストーリーライン">
        <div className="flow-area"><FlowCanvas nodes={nodes} edges={edges} onSelect={selectNode} /></div>
        <SidePanel node={selectedNode} onClose={() => setSelectedNodeId(null)} />
      </section>
    </ReactFlowProvider>
  </main>
}
