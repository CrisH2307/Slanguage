import crypto from "node:crypto";
export function cacheKey({ text, regionPref }) {
  const norm = text.trim().toLowerCase().replace(/\s+/g, " ");
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ norm, regionPref: regionPref || "global" }))
    .digest("hex");
}
