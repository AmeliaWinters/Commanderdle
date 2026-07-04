/** A high-synergy card for a commander, as ranked by EDHREC. */
export interface SynergyCard {
  name: string
  /** Scryfall normal-size image URL, when available. */
  image: string | null
  /** WUBRG color-identity of this card. Every synergy card sits within the
   * commander's identity, so revealed cards bound the answer's colors. */
  colorIdentity: string[]
  /** EDHREC synergy score as a decimal fraction (e.g. 0.34 → 34%). */
  synergy: number
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
  /** Card-market price in USD (Scryfall `prices.usd`, foil as fallback). null when unpriced. */
  price: number | null
  flavorText: string | null
  artCrop: string | null
  normalImage: string | null
  /** How many high-synergy cards this commander has. Lives in the eager "core" data
   * (unlike the `synergyCards` array itself) so Synergy-mode eligibility and pool
   * membership can be computed without loading the heavy synergy payload. */
  synergyCount: number
  /** Top cards by EDHREC synergy score, most synergistic first. Empty until the
   * lazily-loaded synergy data is hydrated (see `ensureSynergyLoaded` in commanders.ts).
   * Only Synergy mode reads it, so it's split out of the initial bundle. */
  synergyCards: SynergyCard[]
}

export type Mode = 'classic' | 'silhouette' | 'quote' | 'synergy' | 'zoom'
