// Safety Helper
const risky = /\b(slur1|slur2|kill yourself|nazi)\b/i; // keep list minimal; expand later

export function scanSafety(text) {
  return risky.test(text) ? { sensitive: true, label: "potentially offensive" } : { sensitive: false };
}
