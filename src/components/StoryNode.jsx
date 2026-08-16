import { Handle, Position } from '@xyflow/react'

const kindLabels = {
  main_chapter: ['📖', 'メイン'],
  event: ['🎭', 'イベント'],
  collaboration: ['✦', 'コラボ'],
  key_story: ['🔑', 'キーストーリー'],
  spot: ['⌖', 'スポット'],
  actor_side: ['◌', 'サイド'],
  finale: ['★', '最終章'],
}

export default function StoryNode({ data, selected }) {
  const kinds = data.kinds ?? [data.kind]
  const episodeCount = Array.isArray(data.episodes) ? data.episodes.length : data.episodes
  const chapterText = data.chapter ? `第${data.chapter}章` : episodeCount ? `全${episodeCount}話` : null
  return (
    <article className={`story-node ${selected ? 'is-selected' : ''}`} style={{ '--troupe-color': data.troupe?.color ?? '#6f6980' }}>
      <Handle type="target" position={Position.Top} />
      <header>
        <span className="kind-badges">
          {kinds.map((kind) => {
            const [icon, label] = kindLabels[kind] ?? ['•', kind]
            return <span key={kind} className="kind-badge">{icon} {label}</span>
          })}
        </span>
        <span className="troupe-dots">
          {data.troupes.map((troupe) => <span key={troupe.id} className="troupe-dot" title={troupe.name} style={{ background: troupe.color }} />)}
        </span>
      </header>
      <h3>{data.title}</h3>
      <p className="node-meta">{chapterText ?? '独立ストーリー'} · {data.releaseDate}</p>
      <div className="character-chips" aria-label="登場キャラクター">
        {data.characters.slice(0, 3).map((character) => <span key={character.id}>{character.name}</span>)}
        {data.characters.length > 3 && <span>+{data.characters.length - 3}</span>}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </article>
  )
}
