// Detection (rule-based) for slang terms in text

import fs from "node:fs";
import path from "node:path";

const DICT = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/data/slang.seed.json"), "utf8"));

const abbrevMap = {
  fr: "for real",
  idc: "I don't care",
  ong: "on God",
};

export function detectSlang(text, opts = {}) {
  const regionPref = opts.regionPref;
  const lower = (text || "").toLowerCase();
  const hits = [];

  for (const entry of DICT) {
    const vars = Array.isArray(entry.variants) && entry.variants.length ? entry.variants : [entry.phrase];
    for (const v of vars) {
      if (!v) continue;
      const re = new RegExp(`(^|\\W)${escapeRe(v)}(\\W|$)`, "i");
      if (re.test(lower)) {
        hits.push(entry);
        break;
      }
    }
  }

  // Keep only one entry per phrase; prefer regionPref if available
  const byPhrase = new Map();
  for (const e of hits) {
    const key = (e.phrase || "").toLowerCase();
    const prev = byPhrase.get(key);
    if (!prev) {
      byPhrase.set(key, e);
      continue;
    }
    const prefers = (arr) => regionPref && Array.isArray(arr) && arr.includes(regionPref);
    if (!prefers(prev.regions) && prefers(e.regions)) byPhrase.set(key, e);
  }
  return dropSubsumed(hits, lower);
}
function dropSubsumed(entries, lowerText) {
  const phrases = entries.map((e) => (e.phrase || "").toLowerCase());
  return entries.filter((e) => {
    const p = (e.phrase || "").toLowerCase();
    const hasLonger = phrases.some((lp) => lp !== p && lp.includes(p) && lowerText.includes(lp));
    return !hasLonger; // drop the shorter if the longer exists in the text
  });
}

export function expandAbbrevs(text) {
  return text.replace(/\b(fr|idc|ong)\b/gi, (m) => abbrevMap[m.toLowerCase()] || m);
}

export function dict() {
  return DICT;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupeById(arr) {
  const seen = new Set();
  return arr.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}
