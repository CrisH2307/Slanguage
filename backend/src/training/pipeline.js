import { promises as fs } from "node:fs";
import path from "node:path";

import { normalizeText } from "../lib/normalize.js";
import { detectSlang, dict as loadDictionary } from "../lib/detect.js";
import { collectFromReddit } from "./collectors/reddit.js";
import { collectFromTwitter } from "./collectors/twitter.js";
import { collectFromYouTube } from "./collectors/youtube.js";
import { collectFromDiscord } from "./collectors/discord.js";
import { COMMON_WORDS } from "./commonWords.js";
import { extractUnknownTokens, makeSnippet } from "./tokenize.js";

const collectors = {
  reddit: collectFromReddit,
  twitter: collectFromTwitter,
  youtube: collectFromYouTube,
  discord: collectFromDiscord,
};

export async function runTrainingPipeline(options = {}) {
  const {
    collectors: requestedCollectors,
    outFile = "src/data/generated/slang.corpus.json",
    tsvFile = "src/data/generated/slang.contexts.tsv",
    maxContextsPerPhrase = 6,
    maxContextsPerCandidate = 6,
    minCandidateCount = 2,
    regionPref = null,
  } = options;

  const collectorList = resolveCollectors(requestedCollectors);
  if (!collectorList.length) throw new Error("No collectors specified. Provide --collectors reddit,...");

  const dictionary = loadDictionary();
  const knownPhrases = buildKnownPhraseSet(dictionary);

  const documents = [];
  for (const name of collectorList) {
    const collector = collectors[name];
    if (!collector) {
      console.warn(`[training] Unknown collector "${name}", skipping.`);
      continue;
    }
    const collectorOptions = options.collectorOptions?.[name] ?? options[name] ?? options;
    console.log(`[training] Collecting from ${name}...`);
    try {
      // eslint-disable-next-line no-await-in-loop
      const fetched = await collector(collectorOptions);
      console.log(`[training] ${name} returned ${fetched.length} documents.`);
      documents.push(...fetched);
    } catch (err) {
      console.warn(`[training] ${name} failed: ${err.message}`);
      if (process.env.DEBUG) console.error(err);
    }
  }

  const sourceCounts = new Map();
  const phraseMap = new Map();
  const candidateMap = new Map();

  for (const doc of documents) {
    const platform = doc.platform || "unknown";
    sourceCounts.set(platform, (sourceCounts.get(platform) || 0) + 1);
    if (!doc.text) continue;

    const normalized = normalizeText(doc.text);
    const hits = detectSlang(normalized, { regionPref });
    const recognized = new Set(hits.map((h) => (h.phrase || "").toLowerCase()).filter(Boolean));

    if (hits.length) {
      for (const hit of hits) {
        const key = (hit.phrase || "").toLowerCase();
        if (!key) continue;
        let bucket = phraseMap.get(key);
        if (!bucket) {
          bucket = {
            phrase: hit.phrase,
            register: hit.register,
            regions: hit.regions,
            meanings: hit.meanings,
            notes: hit.notes,
            totalMentions: 0,
            sources: {},
            contexts: [],
          };
          phraseMap.set(key, bucket);
        }
        bucket.totalMentions += 1;
        bucket.sources[platform] = (bucket.sources[platform] || 0) + 1;
        if (bucket.contexts.length < maxContextsPerPhrase) {
          bucket.contexts.push(buildContext(doc, hit.phrase));
        }
      }
    }

    const tokenSkip = new Set([...knownPhrases, ...recognized]);
    const candidates = extractUnknownTokens(normalized, { knownPhrases: tokenSkip, stopWords: COMMON_WORDS });
    for (const token of candidates) {
      let bucket = candidateMap.get(token);
      if (!bucket) {
        bucket = {
          token,
          count: 0,
          score: 0,
          sources: {},
          contexts: [],
        };
        candidateMap.set(token, bucket);
      }
      bucket.count += 1;
      bucket.sources[platform] = (bucket.sources[platform] || 0) + 1;
      bucket.score += scoreDocument(doc);
      if (bucket.contexts.length < maxContextsPerCandidate) {
        bucket.contexts.push(buildContext(doc, token));
      }
    }
  }

  const existingPhrases = Array.from(phraseMap.values()).sort((a, b) => b.totalMentions - a.totalMentions);
  const unknownCandidates = Array.from(candidateMap.values())
    .filter((c) => c.count >= minCandidateCount)
    .sort((a, b) => b.score - a.score);

  const outPath = path.resolve(process.cwd(), outFile);
  const tsvPath = path.resolve(process.cwd(), tsvFile);
  const summary = {
    collectedAt: new Date().toISOString(),
    documentCount: documents.length,
    sources: Object.fromEntries(sourceCounts),
    existingPhraseCount: existingPhrases.length,
    unknownCandidateCount: unknownCandidates.length,
  };
  const payload = {
    summary,
    existingPhrases,
    unknownCandidates,
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), "utf8");
  await writeContextsTsv(existingPhrases, tsvPath);

  console.log(`[training] Wrote corpus to ${path.relative(process.cwd(), outPath)}`);
  console.log(`[training] Wrote context TSV to ${path.relative(process.cwd(), tsvPath)}`);

  return { ...payload, outPath, tsvPath };
}

function resolveCollectors(requested) {
  if (!requested) return Object.keys(collectors);
  if (Array.isArray(requested)) return requested;
  if (typeof requested === "string") return requested.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function buildKnownPhraseSet(dictionary) {
  const set = new Set();
  for (const entry of dictionary) {
    const phrase = entry?.phrase;
    if (phrase) set.add(phrase.toLowerCase());
    const variants = Array.isArray(entry?.variants) ? entry.variants : [];
    for (const variant of variants) {
      if (variant) set.add(variant.toLowerCase());
    }
  }
  return set;
}

function buildContext(doc, needle) {
  return {
    snippet: makeSnippet(doc.text, needle),
    platform: doc.platform,
    type: doc.type,
    url: doc.url,
    author: doc.author,
    score: doc.score,
    createdAt: doc.createdAt,
    regionHint: doc.metadata?.regionHint || null,
  };
}

function scoreDocument(doc = {}) {
  const base = 1;
  const score = typeof doc.score === "number" ? doc.score : 0;
  const commentBonus = typeof doc.commentCount === "number" ? doc.commentCount * 0.05 : 0;
  return base + Math.log1p(Math.max(0, score)) + commentBonus;
}

async function writeContextsTsv(existingPhrases, filePath) {
  const rows = ["phrase\tplatform\tregionHint\tscore\tcontext"];
  for (const entry of existingPhrases) {
    for (const ctx of entry.contexts) {
      rows.push(
        [
          entry.phrase,
          ctx.platform || "",
          ctx.regionHint || "",
          typeof ctx.score === "number" ? ctx.score : "",
          sanitizeForTsv(ctx.snippet),
        ].join("\t")
      );
    }
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, rows.join("\n"), "utf8");
}

function sanitizeForTsv(value = "") {
  return value.replace(/\s+/g, " ").replace(/\t/g, " ").trim();
}
