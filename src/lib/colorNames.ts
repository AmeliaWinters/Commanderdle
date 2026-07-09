const WUBRG_ORDER = ['W', 'U', 'B', 'R', 'G']

const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
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
  WUBR: 'Yore-Tiller',
  WUBG: 'Witch-Maw',
  WURG: 'Ink-Treader',
  WBRG: 'Dune-Brood',
  UBRG: 'Glint-Eye',
  WUBRG: 'Five-color',
}

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

function key(colors: string[]): string {
  return colors
    .filter((c) => WUBRG_LETTER[c])
    .sort((a, b) => WUBRG_ORDER.indexOf(a) - WUBRG_ORDER.indexOf(b))
    .join('')
}

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

function fold(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

const ALIAS_TO_KEY: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const [k, name] of Object.entries(COLOR_NAMES)) {
    map[fold(name)] = k
  }
  map[fold('mono white')] = 'W'
  map[fold('mono blue')] = 'U'
  map[fold('mono black')] = 'B'
  map[fold('mono red')] = 'R'
  map[fold('mono green')] = 'G'
  map[fold('wubrg')] = 'WUBRG'
  map[fold('rainbow')] = 'WUBRG'
  map[fold('5c')] = 'WUBRG'
  map[fold('fivecolour')] = 'WUBRG'
  for (const [k, missing] of Object.entries(FOUR_COLOR_MISSING)) {
    map[fold(`four color ${missing}`)] = k
    map[fold(`4c ${missing}`)] = k
    map[fold(`${missing}`)] = k
  }
  return map
})()

export function aliasIdentityKey(query: string): string | null {
  return ALIAS_TO_KEY[fold(query)] ?? null
}

export function identityMatchesKey(colors: string[], k: string): boolean {
  return key(colors) === k
}
