const TOKEN_ENDPOINT = "https://www.reddit.com/api/v1/access_token";
const API_ROOT = "https://oauth.reddit.com";
const DEFAULT_SUBREDDITS = ["slang", "linguistics", "teenagers", "toronto", "AskReddit"];
const DEFAULT_USER_AGENT = process.env.REDDIT_USER_AGENT || "slanguage-training/0.1 (+https://github.com/hackthevalley/slanguage)";

let tokenCache = { value: null, expiresAt: 0 };

export async function collectFromReddit(options = {}) {
  const {
    subreddits = DEFAULT_SUBREDDITS,
    limit = 100,
    includeComments = false,
    minScore = 0,
    allowNsfw = false,
    searchQuery,
    sort = "new",
    delayMs = 500,
  } = options;

  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
    throw new Error("[reddit] Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in your environment to enable collection.");
  }

  const token = await getAccessToken();
  const documents = [];
  for (const subreddit of subreddits) {
    let after = null;
    let remaining = limit;
    while (remaining > 0) {
      const pageLimit = Math.min(remaining, 100);
      let listing;
      try {
        listing = await fetchListing({
          subreddit,
          token,
          limit: pageLimit,
          after,
          sort,
          searchQuery,
        });
      } catch (err) {
        if (isPrivateOrForbidden(err)) {
          console.warn(`[reddit] Skipping subreddit "${subreddit}" (${err.message}).`);
          break;
        }
        throw err;
      }

      const children = listing?.data?.children || [];
      if (!children.length) break;

      for (const child of children) {
        const data = child?.data;
        if (!data) continue;
        if (!allowNsfw && data.over_18) continue;
        if ((data.score ?? 0) < minScore) continue;
        const normalized = mapSubmission(data);
        documents.push(normalized);

        if (includeComments && data.num_comments) {
          try {
            const comments = await fetchComments({
              subreddit,
              token,
              articleId: data.id,
              max: Math.min(50, remaining * 2),
              allowNsfw,
            });
            documents.push(...comments);
          } catch (err) {
            if (isPrivateOrForbidden(err)) {
              console.warn(`[reddit] Skipping comments for "${subreddit}" (${err.message}).`);
            } else {
              throw err;
            }
          }
        }
      }

      remaining -= children.length;
      after = listing?.data?.after || null;
      if (!after) break;
      if (delayMs) await sleep(delayMs);
    }
  }
  return documents;
}

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.value && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.value;
  }
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "User-Agent": DEFAULT_USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "read" }),
  });
  if (!response.ok) {
    const text = await safeText(response);
    throw new Error(`[reddit] token request failed (${response.status}): ${text}`);
  }
  const payload = await response.json();
  tokenCache = { value: payload.access_token, expiresAt: now + payload.expires_in * 1000 };
  return tokenCache.value;
}

async function fetchListing({ subreddit, token, limit, after, sort, searchQuery }) {
  const path = searchQuery ? `/r/${subreddit}/search` : `/r/${subreddit}/${sort || "new"}`;
  const url = new URL(API_ROOT + path);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("restrict_sr", "on");
  url.searchParams.set("raw_json", "1");
  if (after) url.searchParams.set("after", after);
  if (searchQuery) {
    url.searchParams.set("q", searchQuery);
    url.searchParams.set("sort", sort || "new");
  }
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": DEFAULT_USER_AGENT,
    },
  });
  if (response.status === 429) {
    throw new Error("[reddit] Rate limited. Increase delayMs or reduce limit.");
  }
  if (!response.ok) {
    const text = await safeText(response);
    throw new Error(`[reddit] listing failed (${response.status}): ${text}`);
  }
  return response.json();
}

async function fetchComments({ subreddit, token, articleId, max, allowNsfw }) {
  const url = new URL(`${API_ROOT}/r/${subreddit}/comments/${articleId}`);
  url.searchParams.set("limit", String(Math.min(max, 100)));
  url.searchParams.set("sort", "top");
  url.searchParams.set("raw_json", "1");
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": DEFAULT_USER_AGENT,
    },
  });
  if (!response.ok) {
    const text = await safeText(response);
    throw new Error(`[reddit] comments failed (${response.status}): ${text}`);
  }
  const payload = await response.json();
  const threads = payload?.[1]?.data?.children || [];
  const out = [];
  for (const thread of threads) {
    const data = thread?.data;
    if (!data || data.body === "[deleted]" || data.body === "[removed]") continue;
    if (!allowNsfw && data.over_18) continue;
    out.push(mapComment(data, subreddit, articleId));
  }
  return out;
}

function mapSubmission(data) {
  const textParts = [data.title, data.selftext].filter(Boolean);
  const text = textParts.join("\n\n").trim();
  return {
    platform: "reddit",
    type: "submission",
    id: data.id,
    url: data.permalink ? `https://www.reddit.com${data.permalink}` : null,
    author: data.author,
    score: data.score ?? 0,
    commentCount: data.num_comments ?? 0,
    createdAt: data.created_utc ? new Date(data.created_utc * 1000).toISOString() : null,
    text,
    metadata: {
      subreddit: data.subreddit,
      flair: data.link_flair_text,
      regionHint: guessRegion(data.subreddit),
      language: data.lang || null,
    },
  };
}

function mapComment(data, subreddit, articleId) {
  return {
    platform: "reddit",
    type: "comment",
    id: data.id,
    url: data.permalink ? `https://www.reddit.com${data.permalink}` : null,
    parentId: articleId,
    author: data.author,
    score: data.score ?? 0,
    createdAt: data.created_utc ? new Date(data.created_utc * 1000).toISOString() : null,
    text: data.body || "",
    metadata: {
      subreddit,
      regionHint: guessRegion(subreddit),
    },
  };
}

function guessRegion(subreddit = "") {
  const lower = subreddit.toLowerCase();
  if (lower.includes("toronto") || lower.includes("ontario") || lower.includes("canada")) return "toronto";
  if (lower.includes("india") || lower.includes("desi")) return "indian_eng";
  if (lower.includes("chinese") || lower.includes("mandarin")) return "chinese_eng";
  if (lower.includes("teen") || lower.includes("genz")) return "genz";
  return "global";
}

function isPrivateOrForbidden(err) {
  if (!err) return false;
  const message = typeof err.message === "string" ? err.message.toLowerCase() : "";
  return message.includes('"reason": "private"') || message.includes('"error": 403') || message.includes("forbidden");
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
