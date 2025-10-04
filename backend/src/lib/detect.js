// Detection (rule-based) for slang terms in text

import fs from "node:fs";
import path from "node:path";

const DICT = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/data/slang.seed.json"), "utf8"));

const abbrevMap = {
  fr: "for real",
  idc: "I don't care",
  ong: "on God",
};

export function detectSlang(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const entry of DICT) {
    for (const v of entry.variants) {
      // word-boundary-ish match
      const re = new RegExp(`(^|\\W)${escapeRe(v)}(\\W|$)`, "i");
      if (re.test(lower)) {
        found.push(entry);
        break;
      }
    }
  }
  return dedupeById(found);
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
