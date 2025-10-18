const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const COMMENT_URL = "https://www.googleapis.com/youtube/v3/commentThreads";

export async function collectFromYouTube(options = {}) {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("[youtube] Set YOUTUBE_API_KEY in your environment to enable collection.");
  }

  const {
    query = "slang explained",
    maxResults = 25,
    limit = 100,
    order = "date",
    includeComments = true,
    delayMs = 500,
    language = "en",
    videoDuration = "any",
  } = options;

  const documents = [];
  let nextPageToken = null;
  let fetched = 0;

  while (fetched < limit) {
    const pageSize = Math.min(50, limit - fetched, maxResults);
    const url = new URL(SEARCH_URL);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", String(pageSize));
    url.searchParams.set("order", order);
    url.searchParams.set("type", "video");
    url.searchParams.set("videoDuration", videoDuration);
    url.searchParams.set("key", process.env.YOUTUBE_API_KEY);
    if (language) url.searchParams.set("relevanceLanguage", language);
    if (nextPageToken) url.searchParams.set("pageToken", nextPageToken);

    // eslint-disable-next-line no-await-in-loop
    const payload = await youtubeFetch(url);
    const items = payload?.items || [];

    for (const item of items) {
      const video = mapVideo(item);
      documents.push(video);
      fetched += 1;

      if (includeComments) {
        // eslint-disable-next-line no-await-in-loop
        const comments = await fetchComments(video.id, { delayMs, max: 50 });
        documents.push(...comments);
      }
    }

    nextPageToken = payload?.nextPageToken;
    if (!nextPageToken) break;
    if (delayMs) await sleep(delayMs); // eslint-disable-line no-await-in-loop
  }

  return documents;
}

async function fetchComments(videoId, { max, delayMs }) {
  const documents = [];
  let remaining = max;
  let pageToken = null;
  while (remaining > 0) {
    const url = new URL(COMMENT_URL);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("videoId", videoId);
    url.searchParams.set("maxResults", String(Math.min(remaining, 100)));
    url.searchParams.set("textFormat", "plainText");
    url.searchParams.set("key", process.env.YOUTUBE_API_KEY);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    let payload;
    try {
      // eslint-disable-next-line no-await-in-loop
      payload = await youtubeFetch(url);
    } catch (err) {
      if (isCommentsDisabledError(err)) {
        console.warn(`[youtube] Comments disabled for video ${videoId}, skipping.`);
        break;
      }
      throw err;
    }
    const rows = payload?.items || [];
    for (const row of rows) {
      const snippet = row?.snippet?.topLevelComment?.snippet;
      if (!snippet || snippet.textDisplay === "[deleted]") continue;
      documents.push(mapComment(videoId, snippet));
    }
    remaining -= rows.length;
    pageToken = payload?.nextPageToken;
    if (!pageToken) break;
    if (delayMs) await sleep(delayMs); // eslint-disable-line no-await-in-loop
  }
  return documents;
}

async function youtubeFetch(url) {
  const res = await fetch(url);
  if (res.status === 403) {
    const text = await safeText(res);
    throw new Error(`[youtube] Forbidden: ${text}`);
  }
  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`[youtube] request failed (${res.status}): ${text}`);
  }
  return res.json();
}

function mapVideo(item) {
  const snippet = item?.snippet || {};
  return {
    platform: "youtube",
    type: "video",
    id: item?.id?.videoId,
    text: `${snippet.title || ""}\n\n${snippet.description || ""}`.trim(),
    createdAt: snippet.publishedAt || null,
    author: snippet.channelTitle || null,
    url: snippet.thumbnails?.default?.url ? `https://www.youtube.com/watch?v=${item?.id?.videoId}` : null,
    metadata: {
      channelId: snippet.channelId,
      tags: snippet.tags,
      language: snippet.defaultLanguage || snippet.defaultAudioLanguage || null,
    },
  };
}

function mapComment(videoId, snippet) {
  return {
    platform: "youtube",
    type: "comment",
    id: snippet.id,
    parentId: videoId,
    text: snippet.textOriginal || snippet.textDisplay || "",
    author: snippet.authorDisplayName || null,
    createdAt: snippet.publishedAt || null,
    score: snippet.likeCount || 0,
    metadata: {
      videoId,
      authorChannelId: snippet.authorChannelId?.value || null,
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

function isCommentsDisabledError(err) {
  if (!err?.message) return false;
  return err.message.includes("commentsDisabled") || err.message.includes("comments disabled");
}
