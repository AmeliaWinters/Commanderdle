/**
 * Build the EDHREC page URL for a commander from its card name, matching EDHREC's own
 * "sanitized" slug rules: front face only, diacritics stripped, apostrophes dropped, and
 * every remaining run of non-alphanumerics collapsed to a single hyphen.
 * e.g. "Atraxa, Praetors' Voice" → https://edhrec.com/commanders/atraxa-praetors-voice
 */
export function edhrecUrl(name: string): string {
  const slug = name
    .split(' // ')[0]
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritical marks
    .toLowerCase()
    .replace(/['’]/g, '') // apostrophes vanish rather than becoming hyphens
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `https://edhrec.com/commanders/${slug}`
}
