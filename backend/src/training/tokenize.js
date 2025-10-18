import { COMMON_WORDS } from "./commonWords.js";

const WORD_RE = /[a-z0-9]+(?:['-][a-z0-9]+)*/gi;
const REPEATS_RE = /(.)\1{2,}/;

export function tokenize(text = "") {
  if (!text) return [];
  const matches = text.toLowerCase().match(WORD_RE);
  return matches ? matches.filter(Boolean) : [];
}

/**
 * Extract tokens that look like slang candidates.
 * We treat a token as interesting when it is not a stopword,
 * not purely numeric, inside the desired length band, and either
 * unrecognized or visually "non-standard" (repeats, digits, etc.).
 */
export function extractUnknownTokens(text, { knownPhrases = new Set(), stopWords = COMMON_WORDS, minLength = 3, maxLength = 18 } = {}) {
  const tokens = tokenize(text);
  const results = [];
  for (const token of tokens) {
    if (token.length < minLength || token.length > maxLength) continue;
    if (stopWords.has(token)) continue;
    if (/^\d+$/.test(token)) continue;
    if (knownPhrases.has(token)) continue;
    const looksUnusual = /\d/.test(token) || REPEATS_RE.test(token) || !stopWords.has(token);
    if (!looksUnusual) continue;
    results.push(token);
  }
  return results;
}

export function makeSnippet(text = "", needle) {
  if (!text) return "";
  const plain = text.replace(/\s+/g, " ").trim();
  if (!needle) return plain.slice(0, 240);
  const lower = plain.toLowerCase();
  const target = needle.toLowerCase();
  const idx = lower.indexOf(target);
  if (idx === -1) return plain.slice(0, 240);
  const start = Math.max(0, idx - 90);
  const end = Math.min(plain.length, idx + target.length + 90);
  return plain.slice(start, end);
}

