// Compose the fallback translation when no AI is used

import { expandAbbrevs } from "./detect.js";

export function composeFallback({ text, audience = "millennial", context = "chat", detected = [] }) {
  const expanded = expandAbbrevs(text);

  const glosses = [];
  const notes = [];
  let sensitive = false;

  for (const e of detected) {
    if (e.meanings?.length) glosses.push(...e.meanings);
    if (e.notes?.length) notes.push(...e.notes);
    if (e.offensive) sensitive = true;
  }

  const plain =
    glosses.length > 0
      ? summarize(glosses)
      : `Plain meaning: ${expanded || "unclear; might be informal or regional slang."}`;

  const rewrite = pickRewrite({ detected, audience, context, fallback: plain });

  return {
    detected: detected.map((e) => ({ phrase: e.phrase, region: e.regions?.[0] || "global" })),
    plain,
    audienceRewrite: rewrite,
    notes,
    safety: { sensitive },
  };
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
  // Keep it short & neutral
  const uniq = Array.from(new Set(glosses));
  return uniq.length === 1
    ? uniq[0].charAt(0).toUpperCase() + uniq[0].slice(1) + "."
    : `They mean: ${uniq.join("; ")}.`;
}
