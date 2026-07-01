import type { Commander } from '../types/commander'

/** Build a Commander for tests, overriding only the fields a case cares about. */
export function makeCommander(overrides: Partial<Commander> = {}): Commander {
  return {
    rank: 1,
    name: 'Test Commander',
    numDecks: 1000,
    colorIdentity: [],
    typeLine: 'Legendary Creature — Human Wizard',
    manaValue: 3,
    power: '2',
    toughness: '2',
    loyalty: null,
    rarity: 'mythic',
    year: 2020,
    setName: 'Test Set',
    flavorText: null,
    artCrop: null,
    normalImage: null,
    synergyCards: [],
    ...overrides,
  }
}
