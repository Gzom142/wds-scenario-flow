import { useEffect, useRef } from 'react'

const kindNames = { main_chapter: 'メインストーリー', event: 'イベントストーリー', collaboration: 'コラボ', spot: 'スポットストーリー', actor_side: 'アクターサイドストーリー', finale: '最終章' }

export default function SidePanel({ node, onClose }) {
  const tweetContainerRef = useRef(null)
  const tweetUrl = node?.data?.tweetUrl

  useEffect(() => {
    if (!tweetUrl || !tweetContainerRef.current) return
    const container = tweetContainerRef.current
    container.replaceChildren()
    const blockquote = document.createElement('blockquote')
    blockquote.className = 'twitter-tweet'
    const link = document.createElement('a')
    link.href = tweetUrl
    link.textContent = '公式Xの投稿を表示'
    blockquote.append(link)
    container.append(blockquote)
    const render = () => window.twttr?.widgets?.load(container)
    if (window.twttr?.widgets) {
      render()
      return undefined
    }
    const script = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]')
    script?.addEventListener('load', render, { once: true })
    const retry = window.setTimeout(render, 1500)
    return () => {
      script?.removeEventListener('load', render)
      window.clearTimeout(retry)
    }
  }, [tweetUrl])

  if (!node) return <aside className="side-panel empty"><p>ストーリーを選択すると、詳細を表示します。</p></aside>
  const { data } = node
  const episodeCount = Array.isArray(data.episodes) ? data.episodes.length : data.episodes
  return (
    <aside className="side-panel">
      <button className="close-button" onClick={onClose} aria-label="詳細を閉じる">×</button>
      <p className="eyebrow">{kindNames[data.kind] ?? data.kind}</p>
      <h2>{data.title}</h2>
      {data.troupe && <p className="troupe-name" style={{ color: data.troupe.color }}>{data.troupe.name}</p>}
      <dl>
        <div><dt>公開日</dt><dd>{data.releaseDate}</dd></div>
        {data.chapter && <div><dt>章</dt><dd>第{data.chapter}章</dd></div>}
        {episodeCount && <div><dt>話数</dt><dd>全{episodeCount}話</dd></div>}
      </dl>
      <section><h3>公式告知</h3>
        {tweetUrl ? (
          <div ref={tweetContainerRef} className="tweet-embed" aria-label="公式X投稿" />
        ) : data.officialUrl ? (
          <p className="tweet-fallback"><a href={data.officialUrl} target="_blank" rel="noreferrer">公式サイトの告知を見る</a><br />X投稿URLは未登録です。</p>
        ) : (
          <p className="tweet-fallback">公式X投稿URLは未登録です。</p>
        )}
      </section>
      <section><h3>登場キャラクター</h3><ul className="character-list">
        {data.characters.map((character) => <li key={character.id}><i style={{ background: character.color }} />{character.name}</li>)}
      </ul></section>
    </aside>
  )
}
