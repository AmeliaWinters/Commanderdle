export interface SynergyCard {
  name: string
  image: string | null
  colorIdentity: string[]
  synergy: number
}

export interface Commander {
  rank: number
  name: string
  numDecks: number
  colorIdentity: string[]
  typeLine: string
  manaValue: number
  power: string | null
  toughness: string | null
  loyalty: string | null
  rarity: string
  rarities?: string[]
  year: number
  setName: string
  price: number | null
  flavorText: string | null
  artCrop: string | null
  normalImage: string | null
  synergyCount: number
  synergyCards: SynergyCard[]
}

export type Mode = 'classic' | 'silhouette' | 'quote' | 'synergy' | 'zoom'
