import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Loads Discord channel exports (such as those produced by tools like `discord-chat-exporter`)
 * and maps messages into the shared training format.
 * Provide either `exportPath` pointing to a single JSON export, or a directory of exports.
 */
export async function collectFromDiscord(options = {}) {
  const { exportPath, limit = 1000, channelHints = [] } = options;
  if (!exportPath) throw new Error("[discord] Provide exportPath to a JSON export file or directory.");

  const stats = { loadedFiles: 0 };
  const files = await findExportFiles(exportPath);
  const documents = [];

  for (const file of files) {
    if (documents.length >= limit) break;
    // eslint-disable-next-line no-await-in-loop
    const payload = await readJson(file);
    stats.loadedFiles += 1;
    const messages = Array.isArray(payload?.messages) ? payload.messages : payload;
    if (!Array.isArray(messages)) continue;

    for (const msg of messages) {
      if (!msg || typeof msg.content !== "string") continue;
      documents.push(mapMessage(msg, payload?.guild, channelHints));
      if (documents.length >= limit) break;
    }
  }

  console.log(`[discord] Loaded ${documents.length} messages from ${stats.loadedFiles} files.`);
  return documents;
}

async function findExportFiles(targetPath) {
  const resolved = path.resolve(process.cwd(), targetPath);
  const info = await fs.stat(resolved);
  if (info.isDirectory()) {
    const entries = await fs.readdir(resolved);
    return entries
      .filter((file) => file.toLowerCase().endsWith(".json"))
      .map((file) => path.join(resolved, file));
  }
  return [resolved];
}

async function readJson(filePath) {
  const data = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(data);
  } catch (err) {
    throw new Error(`[discord] Failed to parse ${filePath}: ${err.message}`);
  }
}

function mapMessage(message, guild, channelHints) {
  const tag = message.channel?.name || message.channel?.id;
  const hint = findHint(tag, channelHints);

  return {
    platform: "discord",
    type: "message",
    id: message.id,
    author: message.author?.name || message.author?.id,
    createdAt: message.timestamp,
    text: message.content || "",
    score: typeof message.reactions?.length === "number" ? message.reactions.length : 0,
    metadata: {
      guild: guild?.name || null,
      channel: tag,
      regionHint: hint?.region || null,
      generationHint: hint?.generation || null,
    },
  };
}

function findHint(channelName, hints = []) {
  if (!channelName || !Array.isArray(hints)) return null;
  const normalized = String(channelName).toLowerCase();
  return hints.find((hint) => {
    if (!hint?.match) return false;
    if (hint.match instanceof RegExp) return hint.match.test(normalized);
    return normalized.includes(String(hint.match).toLowerCase());
  });
}
