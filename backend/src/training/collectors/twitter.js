const SEARCH_URL = "https://api.twitter.com/2/tweets/search/recent";
const DEFAULT_QUERY = "(slang OR meme OR genz OR gen alpha) lang:en -is:retweet";
const DEFAULT_USER_AGENT = process.env.TRAINING_USER_AGENT || "slanguage-training/0.2 (+https://github.com/hackthevalley/slanguage)";

export async function collectFromTwitter(options = {}) {
  if (!process.env.TWITTER_BEARER_TOKEN) {
    throw new Error("[twitter] Set TWITTER_BEARER_TOKEN in your environment to enable collection.");
  }

  const {
    query = DEFAULT_QUERY,
    sinceId,
    maxResults = 50,
    limit = 200,
    delayMs = 500,
    expansions = ["author_id"],
    tweetFields = ["created_at", "lang", "public_metrics", "source"],
    userFields = ["username", "name", "location"],
  } = options;

  let fetched = 0;
  let nextToken = null;
  const documents = [];

  while (fetched < limit) {
    const pageSize = Math.min(100, limit - fetched, maxResults);
    const url = buildSearchUrl({
      query,
      maxResults: pageSize,
      sinceId,
      nextToken,
      expansions,
      tweetFields,
      userFields,
    });

    // eslint-disable-next-line no-await-in-loop
    const payload = await twitterFetch(url);
    const tweets = payload?.data || [];
    const users = payload?.includes?.users || [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    for (const tweet of tweets) {
      documents.push(mapTweet(tweet, userMap.get(tweet.author_id)));
    }

    fetched += tweets.length;
    nextToken = payload?.meta?.next_token;
    if (!nextToken) break;
    if (delayMs) await sleep(delayMs); // eslint-disable-line no-await-in-loop
  }

  return documents;
}

function buildSearchUrl({ query, maxResults, sinceId, nextToken, expansions, tweetFields, userFields }) {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("max_results", String(maxResults));
  if (sinceId) url.searchParams.set("since_id", sinceId);
  if (nextToken) url.searchParams.set("next_token", nextToken);
  if (Array.isArray(expansions) && expansions.length) url.searchParams.set("expansions", expansions.join(","));
  if (Array.isArray(tweetFields) && tweetFields.length) url.searchParams.set("tweet.fields", tweetFields.join(","));
  if (Array.isArray(userFields) && userFields.length) url.searchParams.set("user.fields", userFields.join(","));
  return url;
}

async function twitterFetch(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
      "User-Agent": DEFAULT_USER_AGENT,
    },
  });
  if (res.status === 429) {
    throw new Error("[twitter] Rate limited. Reduce limit or increase delay.");
  }
  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`[twitter] request failed (${res.status}): ${text}`);
  }
  return res.json();
}

function mapTweet(tweet, user) {
  const metrics = tweet?.public_metrics || {};
  return {
    platform: "twitter",
    type: "tweet",
    id: tweet.id,
    author: user?.username ? `@${user.username}` : tweet.author_id,
    text: tweet.text,
    createdAt: tweet.created_at,
    score: typeof metrics.like_count === "number" ? metrics.like_count : 0,
    metadata: {
      lang: tweet.lang,
      source: tweet.source,
      authorName: user?.name,
      authorLocation: user?.location || null,
    },
  };
}

async function safeText(response) {
  try {
    return await response.text();
  } catch {
    return "unknown error";
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
