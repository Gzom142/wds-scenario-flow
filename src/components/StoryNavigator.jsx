function compareNodes(a, b) {
  return (
    a.position.y - b.position.y ||
    a.position.x - b.position.x ||
    String(a.data.title).localeCompare(String(b.data.title), 'ja')
  )
}

function optionLabel(node) {
  const chapter = node.data.chapter ? `第${node.data.chapter}章` : null
  const troupe = node.data.troupes.map(({ name }) => name).join(' / ')
  return [node.data.releaseDate, node.data.title, chapter, troupe].filter(Boolean).join('｜')
}

function StoryOptions({ label, nodes }) {
  if (nodes.length === 0) return null
  return (
    <optgroup label={label}>
      {nodes.map((node) => <option key={node.id} value={node.id}>{optionLabel(node)}</option>)}
    </optgroup>
  )
}

export default function StoryNavigator({ nodes, selectedNodeId, onSelect }) {
  const sortedNodes = [...nodes].sort(compareNodes)
  const mainStories = sortedNodes.filter((node) => node.data.kind === 'main_chapter')
  const eventStories = sortedNodes.filter((node) => node.data.kind === 'event')
  const selectedValue = nodes.some((node) => node.id === selectedNodeId) ? selectedNodeId : ''

  return (
    <nav className="story-navigator" aria-label="ストーリー・イベントへの移動">
      <label htmlFor="story-navigator-select">
        ストーリー・イベントへ移動
        <select
          id="story-navigator-select"
          value={selectedValue ?? ''}
          onChange={(event) => onSelect(event.target.value || null)}
        >
          <option value="">選択してください</option>
          <StoryOptions label="メインストーリー" nodes={mainStories} />
          <StoryOptions label="イベント" nodes={eventStories} />
        </select>
      </label>
      <span className="navigator-count">表示中 {nodes.length}件</span>
    </nav>
  )
}
