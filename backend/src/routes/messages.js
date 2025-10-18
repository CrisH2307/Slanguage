import express from "express";
import { z } from "zod";
import Message from "../models/Message.js";
import { cacheKey } from "../lib/hash.js";
import { detectSlang } from "../lib/detect.js";
import { normalizeText } from "../lib/normalize.js";
import { composeFallback } from "../lib/compose.js";
import { scanSafety } from "../lib/safety.js";
import TransCache from "../models/TransCache.js";

const Body = z.object({
  roomId: z.string(),
  userId: z.string(),
  text: z.string().min(1),
  audience: z.enum(["genz", "millennial"]).default("millennial"),
  context: z.enum(["chat", "email"]).default("chat"),
  regionPref: z.enum(["toronto", "indian_eng", "chinese_eng", "global"]).optional(),
});

const router = express.Router();

router.post("/", async (req, res) => {
  const p = Body.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Bad request" });
  const { roomId, userId, text, audience, context, regionPref } = p.data;

  // translate (reuse your translate logic or call the /api/translate internally)
  const normalized = normalizeText(text);
  const detected = detectSlang(normalized, { regionPref });
  const key = cacheKey({ text: normalized, regionPref });
  let base = await TransCache.findOne({ key }).lean();
  const safety = scanSafety(text);
  const composed = composeFallback({ text, audience, context, detected, regionPref });
  if (!base) {
    base = {
      base: {
        detected: composed.detected,
        plain: composed.plain,
        notes: composed.notes,
        safety,
      },
      key,
    };
    await TransCache.create({ ...base, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) });
  }
  const translation = {
    detected: base.base.detected,
    plain: base.base.plain,
    audienceRewrite: composed.audienceRewrite,
    notes: base.base.notes,
    safety: base.base.safety || safety,
  };

  const doc = await Message.create({
    roomId,
    userId,
    text,
    translation,
    srcHash: key,
  });

  return res.status(201).json(doc);
});

export default router;
