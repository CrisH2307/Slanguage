// src/lib/rag.js
import SlangEntry from "../models/SlangEntry.js";

export async function buildHints(detected, regionPref) {
  if (!detected?.length) return [];
  const phrases = [...new Set(detected.map((e) => e.phrase))];
  const rows = await SlangEntry.find({ phrase: { $in: phrases } })
    .select("phrase meanings regions")
    .limit(10)
    .lean();

  return rows.map((r) => ({
    phrase: r.phrase,
    gloss: r.meanings?.[0] || "",
    region: regionPref && r.regions?.includes(regionPref) ? regionPref : r.regions?.[0] || "global",
  }));
}
