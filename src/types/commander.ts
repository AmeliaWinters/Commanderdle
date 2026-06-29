export interface Commander {
  rank: number
  name: string
  numDecks: number
  /** WUBRG color-identity letters, e.g. ["B","G","R","U","W"]. Empty = colorless. */
  colorIdentity: string[]
  typeLine: string
  manaValue: number
  power: string | null
  toughness: string | null
  rarity: string
  year: number
  setName: string
  flavorText: string | null
  artCrop: string | null
  normalImage: string | null
}

export type Mode = 'classic' | 'silhouette' | 'quote'
