import { parse } from 'yaml'
import charactersSource from './characters.yml?raw'
import storiesSource from './stories.yml?raw'
import storyIndex from './story-index.json'

const charactersDocument = parse(charactersSource)
const storiesDocument = parse(storiesSource)

export const troupes = storiesDocument.troupes
export const availableCharacters = charactersDocument.characters
// 同じ章のメインストーリーは、ゲーム内の劇団順で左から並べる。
const mainTroupeOrder = new Map([
  [1, 0],
  [2, 1],
  [3, 2],
  [4, 3],
])

function normalizeTroupeIds(troupeId) {
  if (troupeId === undefined || troupeId === null) return []
  return Array.isArray(troupeId) ? troupeId : [troupeId]
}

function normalizeKinds(kind) {
  if (kind === undefined || kind === null) return []
  return [...new Set(Array.isArray(kind) ? kind : [kind])]
}

function baseKind(kinds) {
  if (kinds.includes('main_chapter')) return 'main_chapter'
  if (kinds.includes('event')) return 'event'
  return null
}

function primaryTroupeId(story) {
  return story.troupeIds[0]
}

function releaseTimestamp(story) {
  if (!story.releaseDate) return Number.POSITIVE_INFINITY
  const timestamp = Date.parse(story.releaseDate)
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
}

function compareStoriesByRelease(a, b) {
  const aTimestamp = releaseTimestamp(a)
  const bTimestamp = releaseTimestamp(b)
  if (aTimestamp !== bTimestamp) return aTimestamp - bTimestamp
  return String(a.sourceId).localeCompare(String(b.sourceId), undefined, { numeric: true })
}

function buildAutomaticEdges(stories) {
  const edgeMap = new Map()
  const addEdge = (source, target, troupeId) => {
    const key = `${source.id}->${target.id}`
    const edge = edgeMap.get(key) ?? {
      id: `auto-${source.id}-${target.id}`,
      source: source.id,
      target: target.id,
      troupeIds: [],
    }
    edge.troupeIds.push(troupeId)
    edgeMap.set(key, edge)
  }

  troupes.forEach((troupe) => {
    const timeline = stories
      .filter((story) => (
        Number.isFinite(releaseTimestamp(story)) &&
        story.troupeIds.some((id) => String(id) === String(troupe.id))
      ))
      .sort(compareStoriesByRelease)

    let previousEvent = null
    let pendingMainStories = []
    timeline.forEach((story) => {
      if (story.kinds.includes('main_chapter')) {
        pendingMainStories.push(story)
        return
      }

      if (pendingMainStories.length > 0) {
        pendingMainStories.forEach((mainStory) => {
          if (previousEvent) addEdge(previousEvent, mainStory, troupe.id)
          addEdge(mainStory, story, troupe.id)
        })
      } else if (previousEvent) {
        addEdge(previousEvent, story, troupe.id)
      }

      previousEvent = story
      pendingMainStories = []
    })

    if (previousEvent) {
      pendingMainStories.forEach((mainStory) => addEdge(previousEvent, mainStory, troupe.id))
    }
  })
  return [...edgeMap.values()]
}

function buildStories() {
  const overrides = new Map((storiesDocument.overrides ?? []).map((story) => [String(story.sourceId), story]))
  return storyIndex.stories
    .filter((story) => baseKind(normalizeKinds(story.kinds ?? story.kind)))
    .map((story) => {
      const override = overrides.get(String(story.sourceId)) ?? {}
      const kinds = normalizeKinds(override.kinds ?? override.kind ?? story.kinds ?? story.kind)
      return {
        ...story,
        ...override,
        kind: baseKind(kinds),
        kinds,
        troupeIds: normalizeTroupeIds(override.troupeId ?? story.troupeId),
        characterIds: override.characterIds ?? [],
        releaseDate: override.releaseDate ?? story.releaseDate ?? null,
      }
    })
}

function assertData(stories) {
  const validKinds = new Set(['main_chapter', 'event', 'collaboration', 'key_story', 'spot', 'actor_side', 'finale'])
  const characterIds = new Set(availableCharacters.map(({ id }) => String(id)))
  const troupeIds = new Set([...troupes.map(({ id }) => String(id)), 'prologue', 'finale'])
  const storyIds = new Set()
  const sourceIds = new Map()
  stories.forEach((story) => {
    if (storyIds.has(story.id)) throw new Error(`重複したストーリーID: ${story.id}`)
    storyIds.add(story.id)
    const sourceId = String(story.sourceId)
    if (sourceIds.has(sourceId)) throw new Error(`重複したsourceId: ${sourceId}`)
    sourceIds.set(sourceId, story.id)
    if (!story.kind) throw new Error(`${story.id} は main_chapter または event の基礎種別を必要とします`)
    story.kinds.forEach((kind) => {
      if (!validKinds.has(kind)) throw new Error(`${story.id} の種別が未定義です: ${kind}`)
    })
    story.characterIds.forEach((id) => {
      if (!characterIds.has(String(id))) throw new Error(`${story.id} が未定義キャラクター ${id} を参照しています`)
    })
    story.troupeIds.forEach((id) => {
      if (!troupeIds.has(String(id))) throw new Error(`${story.id} が未定義劇団 ${id} を参照しています`)
    })
    if (story.releaseDate && !Number.isFinite(releaseTimestamp(story))) {
      throw new Error(`${story.id} の公開日が不正です: ${story.releaseDate}`)
    }
  })
}

function buildFlowData() {
  const stories = buildStories()
  assertData(stories)
  const characterMap = new Map(availableCharacters.map((character) => [String(character.id), character]))
  const troupeMap = new Map(troupes.map((troupe) => [troupe.id, troupe]))
  const { centerX, episodeSpacing, rowSpacing, mixedEventOffset = 70 } = storiesDocument.layout
  const troupeXMap = new Map([...mainTroupeOrder].map(([troupeId, order]) => [
    troupeId,
    centerX + (order - (mainTroupeOrder.size - 1) / 2) * episodeSpacing,
  ]))
  const mainStories = stories.filter(({ kind }) => kind === 'main_chapter')
  const eventStories = stories.filter(({ kind }) => kind === 'event').sort(compareStoriesByRelease)
  const automaticEdges = buildAutomaticEdges(stories)

  const toNode = (story, position) => ({
    id: story.id,
    type: 'story',
    position,
    data: {
      ...story,
      releaseDate: story.releaseDate ?? '公開日未設定',
      characters: story.characterIds.map((id) => characterMap.get(String(id))),
      troupes: story.troupeIds.map((id) => troupeMap.get(id)).filter(Boolean),
      troupe: troupeMap.get(primaryTroupeId(story)),
    },
  })
  const nodes = []
  const mainGroupsByRelease = new Map()
  mainStories.forEach((story) => {
    const timestamp = releaseTimestamp(story)
    const key = Number.isFinite(timestamp) ? String(timestamp) : `undated-${story.id}`
    const group = mainGroupsByRelease.get(key) ?? { stories: [], releaseTimestamp: timestamp }
    group.stories.push(story)
    mainGroupsByRelease.set(key, group)
  })
  const mainGroups = [...mainGroupsByRelease.values()].map((group) => {
    group.stories.sort((a, b) => (
      (mainTroupeOrder.get(primaryTroupeId(a)) ?? Number.MAX_SAFE_INTEGER) -
      (mainTroupeOrder.get(primaryTroupeId(b)) ?? Number.MAX_SAFE_INTEGER)
    ) || (a.troupeName ?? '').localeCompare(b.troupeName ?? '', 'ja'))
    return {
      kind: 'main',
      ...group,
    }
  })
  const timelineGroups = [
    ...mainGroups,
    ...eventStories.map((story) => ({
      kind: 'event',
      story,
      releaseTimestamp: releaseTimestamp(story),
    })),
  ].sort((a, b) => {
    if (a.releaseTimestamp !== b.releaseTimestamp) return a.releaseTimestamp - b.releaseTimestamp
    if (a.kind === b.kind) return 0
    return a.kind === 'main' ? -1 : 1
  })

  // メインは劇団ごとの横位置を固定し、各章自身の公開日に合わせて縦に並べる。
  // 同日公開のメイン（初期の各第1章など）は同じ高さに横並びとなる。
  timelineGroups.forEach((group, timelineIndex) => {
    if (group.kind !== 'main') return
    group.stories.forEach((story) => {
      const x = troupeXMap.get(primaryTroupeId(story)) ?? centerX
      const position = { x, y: timelineIndex * rowSpacing }
      nodes.push(toNode(story, position))
    })
  })

  timelineGroups.forEach((group, timelineIndex) => {
    if (group.kind !== 'event') return
    const { story } = group
    const troupeXs = [...new Set(story.troupeIds)]
      .map((troupeId) => troupeXMap.get(troupeId))
      .filter((x) => x !== undefined)
    const averageX = troupeXs.length > 0
      ? troupeXs.reduce((sum, troupeX) => sum + troupeX, 0) / troupeXs.length
      : centerX
    const offsetDirection = averageX === centerX
      ? (Number(story.sourceId) % 2 === 0 ? 1 : -1)
      : Math.sign(averageX - centerX)
    const x = troupeXs.length > 1
      ? averageX + offsetDirection * mixedEventOffset
      : averageX
    const position = { x, y: timelineIndex * rowSpacing }
    nodes.push(toNode(story, position))
  })

  const edges = automaticEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    data: { troupeIds: edge.troupeIds },
    style: {
      stroke: edge.troupeIds.length === 1
        ? troupeMap.get(edge.troupeIds[0])?.color ?? '#9a91ab'
        : '#9a91ab',
      strokeWidth: 2,
    },
  }))
  return { nodes, edges }
}

export const { nodes: initialNodes, edges: initialEdges } = buildFlowData()
