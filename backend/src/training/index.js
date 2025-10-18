#!/usr/bin/env node
import "dotenv/config";
import path from "node:path";

import { runTrainingPipeline } from "./pipeline.js";

async function main() {
  const argv = parseArgs(process.argv.slice(2));
  if (argv.help) {
    printHelp();
    return;
  }

  try {
    const result = await runTrainingPipeline(buildOptions(argv));
    console.log(`[training] Completed. Unknown candidates: ${result.unknownCandidates.length}.`);
    console.log(`[training] Review: ${path.relative(process.cwd(), result.outPath)}`);
  } catch (err) {
    console.error(`[training] Failed: ${err.message}`);
    if (process.env.DEBUG) console.error(err);
    process.exitCode = 1;
  }
}

function buildOptions(argv) {
  const options = {};
  if (argv.collectors) options.collectors = argv.collectors.split(",").map((s) => s.trim()).filter(Boolean);
  if (argv.out) options.outFile = argv.out;
  if (argv.tsv) options.tsvFile = argv.tsv;
  if (argv.region) options.regionPref = argv.region;
  if (argv["max-contexts"]) options.maxContextsPerPhrase = parseIntStrict(argv["max-contexts"]);
  if (argv["max-candidate-contexts"]) options.maxContextsPerCandidate = parseIntStrict(argv["max-candidate-contexts"]);
  if (argv["min-candidate-count"]) options.minCandidateCount = parseIntStrict(argv["min-candidate-count"]);

  const sharedLimit = parseIntStrict(argv.limit);
  const collectorOptions = {};

  const redditConfig = {};
  if (argv["reddit-subs"]) redditConfig.subreddits = parseList(argv["reddit-subs"]);
  if (sharedLimit) redditConfig.limit = sharedLimit;
  if (argv["reddit-limit"]) redditConfig.limit = parseIntStrict(argv["reddit-limit"]);
  if (argv["reddit-query"]) redditConfig.searchQuery = argv["reddit-query"];
  if (argv["reddit-sort"]) redditConfig.sort = argv["reddit-sort"];
  if (argv["reddit-min-score"]) redditConfig.minScore = parseIntStrict(argv["reddit-min-score"]);
  if (argv["reddit-comments"] !== undefined) redditConfig.includeComments = parseBoolean(argv["reddit-comments"]);
  if (argv["allow-nsfw"] !== undefined) redditConfig.allowNsfw = parseBoolean(argv["allow-nsfw"]);
  if (argv["delay-ms"]) redditConfig.delayMs = parseIntStrict(argv["delay-ms"]);

  if (Object.keys(redditConfig).length) collectorOptions.reddit = redditConfig;

  const twitterConfig = {};
  if (sharedLimit) twitterConfig.limit = sharedLimit;
  if (argv["twitter-limit"]) twitterConfig.limit = parseIntStrict(argv["twitter-limit"]);
  if (argv["twitter-query"]) twitterConfig.query = argv["twitter-query"];
  if (argv["twitter-since-id"]) twitterConfig.sinceId = argv["twitter-since-id"];
  if (argv["twitter-max-results"]) twitterConfig.maxResults = parseIntStrict(argv["twitter-max-results"]);
  if (argv["twitter-delay-ms"]) twitterConfig.delayMs = parseIntStrict(argv["twitter-delay-ms"]);
  if (argv["twitter-expansions"]) twitterConfig.expansions = parseList(argv["twitter-expansions"]);
  if (argv["twitter-tweet-fields"]) twitterConfig.tweetFields = parseList(argv["twitter-tweet-fields"]);
  if (argv["twitter-user-fields"]) twitterConfig.userFields = parseList(argv["twitter-user-fields"]);
  if (Object.keys(twitterConfig).length) collectorOptions.twitter = twitterConfig;

  const youtubeConfig = {};
  if (sharedLimit) youtubeConfig.limit = sharedLimit;
  if (argv["youtube-limit"]) youtubeConfig.limit = parseIntStrict(argv["youtube-limit"]);
  if (argv["youtube-query"]) youtubeConfig.query = argv["youtube-query"];
  if (argv["youtube-order"]) youtubeConfig.order = argv["youtube-order"];
  if (argv["youtube-delay-ms"]) youtubeConfig.delayMs = parseIntStrict(argv["youtube-delay-ms"]);
  if (argv["youtube-comments"] !== undefined) youtubeConfig.includeComments = parseBoolean(argv["youtube-comments"]);
  if (argv["youtube-lang"]) youtubeConfig.language = argv["youtube-lang"];
  if (argv["youtube-duration"]) youtubeConfig.videoDuration = argv["youtube-duration"];
  if (Object.keys(youtubeConfig).length) collectorOptions.youtube = youtubeConfig;

  const discordConfig = {};
  if (argv["discord-export"]) discordConfig.exportPath = argv["discord-export"];
  if (sharedLimit) discordConfig.limit = sharedLimit;
  if (argv["discord-limit"]) discordConfig.limit = parseIntStrict(argv["discord-limit"]);
  if (argv["discord-channel-hints"]) {
    discordConfig.channelHints = parseList(argv["discord-channel-hints"]).map((entry) => {
      const [matchRaw, region = null, generation = null] = entry.split(":").map((s) => s?.trim());
      let match = matchRaw;
      if (match && match.startsWith("/") && match.endsWith("/")) {
        const body = match.slice(1, -1);
        try {
          match = new RegExp(body, "i");
        } catch {
          match = body;
        }
      }
      return { match, region, generation };
    });
  }
  if (Object.keys(discordConfig).length) collectorOptions.discord = discordConfig;

  if (Object.keys(collectorOptions).length) options.collectorOptions = collectorOptions;

  return options;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith("-")) continue;
    if (raw === "-h" || raw === "--help") {
      out.help = true;
      continue;
    }
    const trimmed = raw.replace(/^-+/, "");
    const [key, inlineVal] = trimmed.split("=");
    if (inlineVal !== undefined) {
      out[key] = inlineVal;
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("-")) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function parseIntStrict(value) {
  if (value === undefined || value === true) return undefined;
  const num = Number.parseInt(value, 10);
  return Number.isNaN(num) ? undefined : num;
}

function parseBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  const normalized = String(value).toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return Boolean(value);
}

function parseList(value) {
  if (!value) return undefined;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function printHelp() {
  console.log(`Usage: node src/training/index.js [options]

Options:
  --collectors reddit,twitter  Comma separated collectors to run (default: all available).
  --limit 200                  Total documents per collector.
  --out path/to/file.json      Override corpus output path.
  --tsv path/to/file.tsv       Override TSV output path.
  --region toronto             Prefer contexts for a region when scoring.
  --max-contexts 8             Max contexts stored per known phrase.
  --max-candidate-contexts 6   Max contexts stored per unknown candidate.
  --min-candidate-count 2      Minimum hits before including a candidate.

Reddit specific:
  --reddit-subs slang,teenagers    Subreddits to crawl.
  --reddit-limit 300               Limit documents per subreddit.
  --reddit-query \"skibidi\"           Optional search query.
  --reddit-sort new|hot|relevance   Listing sort (default: new).
  --reddit-min-score 5              Filter low-score items.
  --reddit-comments true            Pull top comments as well.
  --allow-nsfw false                Collect NSFW posts.
  --delay-ms 500                    Delay between consecutive page fetches.

Twitter:
  --twitter-query "lang:en slang"   Search query (API v2 syntax).
  --twitter-limit 300               Total tweets to pull.
  --twitter-max-results 100         Page size.
  --twitter-since-id 123456         Fetch tweets after this snowflake.

YouTube:
  --youtube-query "slang explain"   Search term.
  --youtube-order relevance         Sort order (date|rating|relevance|title|viewCount).
  --youtube-comments false          Skip comment collection.
  --youtube-duration short          Filter by video length (any|short|medium|long).

Discord exports:
  --discord-export ./exports/guild  Path to JSON export file or directory.
  --discord-channel-hints genz:genz Use channel name hints ("match:region:generation").

Environment:
  REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET / REDDIT_USER_AGENT
  TWITTER_BEARER_TOKEN
  YOUTUBE_API_KEY
  (Discord exports are local files; ensure you have permission to use them.)
`);
}

main();
