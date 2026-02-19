/**
 * Normalizes an artist name for consistent matching between
 * Spotify-synced artists and ingested concert data.
 *
 * Both sync-artists and ingest-concerts use this function so that
 * "The Black Lips" (Spotify) and "The Black Lips" (OMR) both resolve
 * to "black lips" and produce a match.
 */
export function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^the\s+/i, "")
    .replace(/\s+&\s+/g, " and ")
    .replace(/['']/g, "'")
    .trim();
}
