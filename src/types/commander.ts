/** A high-synergy card for a commander, as ranked by EDHREC. */
export interface SynergyCard {
  name: string
  /** Scryfall normal-size image URL, when available. */
  image: string | null
}

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
  /** Planeswalker starting loyalty, when applicable. */
  loyalty: string | null
  rarity: string
  year: number
  setName: string
  flavorText: string | null
  artCrop: string | null
  normalImage: string | null
  /** Top cards by EDHREC synergy score, most synergistic first. May be empty. */
  synergyCards: SynergyCard[]
}

export type Mode = 'classic' | 'silhouette' | 'quote' | 'synergy' | 'zoom'
