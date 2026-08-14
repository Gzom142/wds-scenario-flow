export default function Filter({ draft, onChange, onApply, onReset, troupes, characters, kinds }) {
  const update = (key, value) => onChange({ ...draft, [key]: value })
  return (
    <form className="filter-bar" onSubmit={(event) => { event.preventDefault(); onApply() }}>
      <label>劇団
        <select value={draft.troupeId} onChange={(event) => update('troupeId', event.target.value)}>
          <option value="">すべて</option>
          {troupes.map((troupe) => <option key={troupe.id} value={troupe.id}>{troupe.name}</option>)}
        </select>
      </label>
      <label>種別
        <select value={draft.kind} onChange={(event) => update('kind', event.target.value)}>
          <option value="">すべて</option>
          {kinds.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}
        </select>
      </label>
      <label>登場キャラクター
        <select value={draft.characterId} onChange={(event) => update('characterId', event.target.value)}>
          <option value="">すべて</option>
          {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
        </select>
      </label>
      <button type="submit">適用</button>
      <button className="text-button" type="button" onClick={onReset}>リセット</button>
    </form>
  )
}
