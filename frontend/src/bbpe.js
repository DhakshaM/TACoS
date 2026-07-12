// frontend/src/bbpe.js
// Shared HuggingFace ByteLevel BPE decoder.
// Builds the byte map once and reuses it.

function buildByteMap() {
  const m = {}
  const addRange = (lo, hi) => {
    for (let i = lo; i <= hi; i++) m[String.fromCodePoint(i)] = i
  }
  // Printable ASCII / Latin-1 ranges that map to themselves in HF ByteLevel
  addRange(0x21, 0x7E)
  addRange(0xA1, 0xAC)
  addRange(0xAE, 0xFF)
  // Remaining 256 bytes map to U+0100… (Ā, ā, Ă, …)
  let extra = 0x100
  for (let b = 0; b < 256; b++) {
    const c = String.fromCodePoint(b)
    if (!(c in m)) { m[String.fromCodePoint(extra)] = b; extra++ }
  }
  // Ġ (U+0120) is the explicit space token
  m['Ġ'] = 0x20
  return m
}

const BYTE_MAP = buildByteMap()

/**
 * Decode a single BBPE token string to its Unicode equivalent.
 * Returns null if the token contains no recognisable byte-level chars.
 *
 * Examples:
 *   decodeBBPEToken('Ġ')          → ' '
 *   decodeBBPEToken('Ġà¤Ń')      → ' भ'
 *   decodeBBPEToken('à¤¾')        → 'ा'
 */
export function decodeBBPEToken(tok) {
  try {
    const bytes = []
    for (const ch of tok) {
      if (ch in BYTE_MAP) bytes.push(BYTE_MAP[ch])
    }
    if (bytes.length === 0) return null
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes))
  } catch {
    return null
  }
}

/**
 * Decode an array of BBPE tokens as a single string.
 * Equivalent to decodeBBPEToken(toks.join('')).
 */
export function decodeBBPETokens(toks) {
  return decodeBBPEToken(toks.join(''))
}
