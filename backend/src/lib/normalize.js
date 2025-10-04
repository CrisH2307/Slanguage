// src/lib/normalize.js
const abbrev = { fr: "for real", idc: "i don't care", ngl: "not gonna lie", imo: "in my opinion", tbh: "to be honest" };
const emoji = { "💀": "extremely funny", "🔥": "amazing", "🙏": "please", "😂": "very funny" };

export function normalizeText(t = "") {
  let s = t.replace(/\b(fr|idc|ngl|imo|tbh)\b/gi, (m) => abbrev[m.toLowerCase()] || m);
  s = s.replace(/[💀🔥🙏😂]/g, (m) => " " + (emoji[m] || "") + " ");
  return s.replace(/\s{2,}/g, " ").trim();
}
