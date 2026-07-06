const WUBRG_ORDER = ['W', 'U', 'B', 'R', 'G']

/**
 * Canonical Magic color-identity names — the guild/shard/wedge/nephilim vocabulary the
 * MTG community uses as a matter of course. Keyed by WUBRG-sorted identity letters so a
 * lookup is order-independent (["R","B"] and ["B","R"] both resolve to "Rakdos").
 */
const COLOR_NAMES: Record<string, string> = {
  // Mono
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  // Guilds (two-color)
  WU: 'Azorius',
  WB: 'Orzhov',
  WR: 'Boros',
  WG: 'Selesnya',
  UB: 'Dimir',
  UR: 'Izzet',
  UG: 'Simic',
  BR: 'Rakdos',
  BG: 'Golgari',
  RG: 'Gruul',
  // Shards & wedges (three-color)
  WUB: 'Esper',
  WUR: 'Jeskai',
  WUG: 'Bant',
  WBR: 'Mardu',
  WBG: 'Abzan',
  WRG: 'Naya',
  UBR: 'Grixis',
  UBG: 'Sultai',
  URG: 'Temur',
  BRG: 'Jund',
  // Four-color (nephilim nicknames)
  WUBR: 'Yore-Tiller',
  WUBG: 'Witch-Maw',
  WURG: 'Ink-Treader',
  WBRG: 'Dune-Brood',
  UBRG: 'Glint-Eye',
  // Five-color
  WUBRG: 'Five-color',
}

/** Human "no X" descriptor for the four-color combos (how most players say them). */
const FOUR_COLOR_MISSING: Record<string, string> = {
  WUBR: 'no green',
  WUBG: 'no red',
  WURG: 'no black',
  WBRG: 'no blue',
  UBRG: 'no white',
}

const WUBRG_LETTER: Record<string, string> = {
  W: 'W',
  U: 'U',
  B: 'B',
  R: 'R',
  G: 'G',
}

/** WUBRG-sorted key for a color-identity array (e.g. ["R","B"] → "BR"). */
function key(colors: string[]): string {
  return colors
    .filter((c) => WUBRG_LETTER[c])
    .sort((a, b) => WUBRG_ORDER.indexOf(a) - WUBRG_ORDER.indexOf(b))
    .join('')
}

/**
 * The community name for a color identity: "Rakdos", "Temur", "Mono-White",
 * "Colorless", "Four-color (no red)", "Five-color". Returns null for anything that
 * somehow isn't a real WUBRG combination.
 */
export function colorIdentityName(colors: string[]): string | null {
  const k = key(colors)
  if (!k) return 'Colorless'
  const name = COLOR_NAMES[k]
  if (!name) return null
  if (k.length === 1) return k === 'W' || k === 'U' || k === 'B' || k === 'R' || k === 'G'
    ? `Mono-${name}`
    : name
  if (k.length === 4) return `${name} (four-color, ${FOUR_COLOR_MISSING[k]})`
  return name
}

// --- Search aliases -----------------------------------------------------------------

/** Fold an alias/query the same way commander search does (lowercase, strip punctuation). */
function fold(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/**
 * Folded alias → WUBRG-sorted identity key. Includes every guild/shard/wedge/nephilim
 * name plus the "four color no red"-style descriptors and mono-color words, so a player
 * can type "rakdos", "temur", "wubrg", or "fivecolor" and get commanders of that identity.
 */
const ALIAS_TO_KEY: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const [k, name] of Object.entries(COLOR_NAMES)) {
    map[fold(name)] = k
  }
  // Mono words on their own ("white", "black") map to the mono identity.
  map[fold('mono white')] = 'W'
  map[fold('mono blue')] = 'U'
  map[fold('mono black')] = 'B'
  map[fold('mono red')] = 'R'
  map[fold('mono green')] = 'G'
  // Five-color synonyms.
  map[fold('wubrg')] = 'WUBRG'
  map[fold('rainbow')] = 'WUBRG'
  map[fold('5c')] = 'WUBRG'
  map[fold('fivecolour')] = 'WUBRG'
  // Four-color "no X" descriptors.
  for (const [k, missing] of Object.entries(FOUR_COLOR_MISSING)) {
    map[fold(`four color ${missing}`)] = k
    map[fold(`4c ${missing}`)] = k
    map[fold(`${missing}`)] = k
  }
  return map
})()

/**
 * If a query is a color-combo alias ("rakdos", "temur", "mono white"), return the
 * WUBRG-sorted identity key it names; otherwise null. Used to surface commanders by
 * color identity in the guess search.
 */
export function aliasIdentityKey(query: string): string | null {
  return ALIAS_TO_KEY[fold(query)] ?? null
}

/** True when a commander's identity matches a given WUBRG-sorted key exactly. */
export function identityMatchesKey(colors: string[], k: string): boolean {
  return key(colors) === k
}
