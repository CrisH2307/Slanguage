// Compose the fallback translation when no AI is used

import { expandAbbrevs } from "./detect.js";

export function composeFallback({ text, audience = "millennial", context = "chat", detected = [], regionPref }) {
  const glosses = [];
  const notes = [];
  let sensitive = false;
  for (const e of detected) {
    if (e.meanings?.length) glosses.push(...e.meanings);
    if (e.notes?.length) notes.push(...e.notes);
    if (e.offensive) sensitive = true;
  }
  const glossesFiltered = glosses.filter((g) => !/\bi\/he\/they\b/i.test(g));
  const use = glossesFiltered.length ? glossesFiltered : glosses;
  const plain = use.length ? summarize(use) : "Meaning unclear; likely informal or regional slang.";

  // NEW: try sentence rewrite from the original
  const replaceAttempt = rewriteByReplacement(text, detected, audience, context);
  const audienceRewrite = replaceAttempt ?? pickRewrite({ detected, audience, context, fallback: plain });
  function pickRegion(regions, pref) {
    if (!Array.isArray(regions) || regions.length === 0) return "global";
    if (pref && regions.includes(pref)) return pref;
    return regions[0];
  }

  return {
    detected: detected.map((e) => ({ phrase: e.phrase, region: pickRegion(e.regions, regionPref) })),
    plain,
    audienceRewrite,
    notes,
    safety: { sensitive },
  };
}

function rewriteByReplacement(text, detected, audience, context) {
  // Build (variant → replacement) pairs
  const pairs = [];
  for (const e of detected) {
    const tmpl = e.rewriteTemplates?.[context] || e.rewriteTemplates?.[audience];
    if (!tmpl) continue;
    const vars = e.variants?.length ? e.variants : [e.phrase];
    for (const v of vars) pairs.push([v, tmpl]);
  }
  // Replace longest first
  pairs.sort((a, b) => b[0].length - a[0].length);

  let out = text;
  for (const [v, repl] of pairs) {
    const re = new RegExp(`\\b${escapeRe(v)}\\b`, "gi");
    out = out.replace(re, repl);
  }
  out = tidy(out);

  function grammarPost(s) {
    if (!s) return s;
    // Make “they got so/very funny” sound natural
    s = s.replace(/\bthey got (so|very) funny\b/gi, "they're $1 funny");
    // Common article fixups
    s = s.replace(/\ba lot jokes\b/gi, "a lot of jokes");
    // Cleanup, caps, punctuation
    s = s.replace(/\s{2,}/g, " ").trim();
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.!?]$/.test(s)) s += ".";
    return s;
  }

  // In your rewrite function, after doing replacements:
  out = grammarPost(out);

  // If nothing changed or slang remains, return null so we can fallback
  const unchanged = out.trim().toLowerCase() === text.trim().toLowerCase();
  const stillSlang = detected.some((e) => new RegExp(`\\b${escapeRe(e.phrase)}\\b`, "i").test(out));
  return !unchanged && !stillSlang ? out : null;
}

function tidy(s) {
  s = s
    .replace(/\s{2,}/g, " ")
    .replace(/\bi\b/g, "I")
    .trim();
  s = s[0]?.toUpperCase() + s.slice(1);
  if (!/[.!?]$/.test(s)) s += ".";
  // collapse "I/he/they" to neutral "they"
  s = s.replace(/I\/he\/they/gi, "they");
  return s;
}
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickRewrite({ detected, audience, context, fallback }) {
  // Priority: context template → audience template → fallback
  for (const e of detected) {
    const t = e.rewriteTemplates || {};
    if (context && t[context]) return t[context];
    if (audience && t[audience]) return t[audience];
  }
  return fallback;
}

function summarize(glosses) {
  const uniq = Array.from(new Set(glosses.map((g) => g.replace(/\.$/, ""))));
  if (uniq.length === 1) return cap(uniq[0]) + ".";
  if (uniq.length === 2) return `They mean ${uniq[0]} and ${uniq[1]}.`;
  return `They're saying ${uniq.slice(0, -1).join(", ")}, and ${uniq.slice(-1)}.`;
}
function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
