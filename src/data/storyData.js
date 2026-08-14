import { parse } from 'yaml'
import charactersSource from './characters.yml?raw'
import storiesSource from './stories.yml?raw'
import storyIndex from './story-index.json'

const charactersDocument = parse(charactersSource)
const storiesDocument = parse(storiesSource)

export const troupes = storiesDocument.troupes
export const availableCharacters = charactersDocument.characters
export const storyKinds = [
  { id: 'main_chapter', label: 'メイン' },
  { id: 'event', label: 'イベント' },
]

// 同じ章のメインストーリーは、ゲーム内の劇団順で左から並べる。
const mainTroupeOrder = new Map([
  ['sirius', 0],
  ['eden', 1],
  ['gingaza', 2],
  ['denki', 3],
])

function buildStories() {
  const overrides = new Map((storiesDocument.overrides ?? []).map((story) => [String(story.sourceId), story]))
  return storyIndex.stories
    .filter((story) => story.kind === 'main_chapter' || story.kind === 'event')
    .map((story) => {
      const override = overrides.get(String(story.sourceId)) ?? {}
      return {
        ...story,
        ...override,
        characterIds: override.characterIds ?? [],
        releaseDate: override.releaseDate ?? story.releaseDate ?? null,
      }
    })
}

function assertData(stories) {
  const characterIds = new Set(availableCharacters.map(({ id }) => id))
  const storyIds = new Set()
  stories.forEach((story) => {
    if (storyIds.has(story.id)) throw new Error(`重複したストーリーID: ${story.id}`)
    storyIds.add(story.id)
    story.characterIds.forEach((id) => {
      if (!characterIds.has(id)) throw new Error(`${story.id} が未定義キャラクター ${id} を参照しています`)
    })
  })
  ;(storiesDocument.edges ?? []).forEach(({ source, target }) => {
    if (!storyIds.has(source) || !storyIds.has(target)) throw new Error(`edge の参照先が存在しません: ${source} → ${target}`)
  })
}

function mainRow(story) {
  if (story.troupeId === 'prologue') return 0
  if (story.troupeId === 'finale') return 6
  return story.chapter ?? 1
}

function buildFlowData() {
  const stories = buildStories()
  assertData(stories)
  const characterMap = new Map(availableCharacters.map((character) => [character.id, character]))
  const troupeMap = new Map(troupes.map((troupe) => [troupe.id, troupe]))
  const { centerX, episodeSpacing, rowSpacing } = storiesDocument.layout
  const mainStories = stories.filter(({ kind }) => kind === 'main_chapter')
  const eventStories = stories.filter(({ kind }) => kind === 'event').sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
  const mainRows = new Map()
  mainStories.forEach((story) => {
    const row = mainRow(story)
    mainRows.set(row, [...(mainRows.get(row) ?? []), story])
  })

  const toNode = (story, position) => ({
    id: story.id,
    type: 'story',
    position,
    data: {
      ...story,
      releaseDate: story.releaseDate ?? '公開日未設定',
      characters: story.characterIds.map((id) => characterMap.get(id)),
      troupe: troupeMap.get(story.troupeId),
    },
  })
  const nodes = []
  mainRows.forEach((rowStories, row) => {
    rowStories.sort((a, b) => (
      (mainTroupeOrder.get(a.troupeId) ?? Number.MAX_SAFE_INTEGER) -
      (mainTroupeOrder.get(b.troupeId) ?? Number.MAX_SAFE_INTEGER)
    ) || a.troupeName.localeCompare(b.troupeName, 'ja'))
    const startX = centerX - ((rowStories.length - 1) * episodeSpacing) / 2
    rowStories.forEach((story, index) => nodes.push(toNode(story, { x: startX + index * episodeSpacing, y: row * rowSpacing })))
  })
  const eventStartY = 7 * rowSpacing
  eventStories.forEach((story, index) => nodes.push(toNode(story, { x: centerX, y: eventStartY + index * 178 })))

  const edges = (storiesDocument.edges ?? []).map((edge) => ({
    id: edge.id ?? `${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: edge.relation === 'prerequisite',
    label: edge.relation === 'prerequisite' ? '推奨順' : undefined,
    style: { stroke: '#9a91ab', strokeWidth: 2 },
    labelStyle: { fill: '#675e76', fontSize: 11 },
  }))
  return { nodes, edges }
}

export const { nodes: initialNodes, edges: initialEdges } = buildFlowData()
