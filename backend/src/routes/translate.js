import express from "express";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { detectSlang } from "../lib/detect.js"; // your dictionary matcher
import { composeFallback } from "../lib/compose.js"; // rule-based composer
import { scanSafety } from "../lib/safety.js"; // simple content scan

const abbrev = { fr: "for real", idc: "i don't care", ngl: "not gonna lie", imo: "in my opinion", tbh: "to be honest" };
const emoji = { "💀": "extremely funny", "🔥": "amazing", "🙏": "please", "😂": "very funny" };
function normalizeText(t = "") {
  let s = t.replace(/\b(fr|idc|ngl|imo|tbh)\b/gi, (m) => abbrev[m.toLowerCase()] || m);
  s = s.replace(/[💀🔥🙏😂]/g, (m) => " " + (emoji[m] || "") + " ");
  return s.replace(/\s{2,}/g, " ").trim();
}

const cache = new Map();
const cacheKey = ({ text, audience, context, regionPref }) =>
  JSON.stringify({
    t: normalizeText(text).toLowerCase(),
    a: audience,
    c: context,
    r: regionPref || "global",
  });

const router = express.Router();

// Validate request body
const Body = z.object({
  text: z.string().min(1),
  audience: z.enum(["genz", "millennial"]).default("millennial"),
  context: z.enum(["chat", "email"]).default("chat"),
  regionPref: z.enum(["toronto", "indian_eng", "chinese_eng", "global"]).optional(),
});

// Optional Gemini client (only created if KEY exists)
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

router.post("/", async (req, res) => {
  // 1) validate
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Bad request", issues: parsed.error.issues });
  }
  const { text, audience, context, regionPref } = parsed.data;

  // 2) cache hit?
  const key = cacheKey({ text, audience, context, regionPref });
  if (cache.has(key)) {
    return res.json(cache.get(key));
  }

  // 3) detect slang (use normalized text for better matches)
  const textNorm = normalizeText(text);
  const detected = detectSlang(textNorm, { regionPref });

  // 4) try LLM (guarded), else 5) fallback composer
  let out;
  try {
    if (!genAI) throw new Error("No GEMINI_API_KEY");

    // hard timeout so your API stays snappy
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1600);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = buildPrompt({ text, audience, context, regionPref, detected });

    // Ask for JSON directly
    const result = await model.generateContent(
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      },
      { signal: controller.signal }
    );

    clearTimeout(timer);

    const raw = result?.response?.text?.() || "";
    let parsedJSON;
    try {
      parsedJSON = JSON.parse(raw);
    } catch {
      throw new Error("Invalid JSON");
    }
    if (!parsedJSON || typeof parsedJSON !== "object") throw new Error("Invalid JSON");
    if (typeof parsedJSON.plain !== "string" || typeof parsedJSON.audienceRewrite !== "string") {
      throw new Error("Missing required fields");
    }
    if (!Array.isArray(parsedJSON.detected)) parsedJSON.detected = [];
    if (!Array.isArray(parsedJSON.notes)) parsedJSON.notes = [];
    if (!parsedJSON.safety || typeof parsedJSON.safety.sensitive !== "boolean") {
      parsedJSON.safety = { sensitive: false };
    }

    // add local safety scan (keeps behavior consistent)
    const safety = scanSafety(text);
    out = { ...parsedJSON, safety };
  } catch {
    // 5) fallback compose (always works)
    const fallback = composeFallback({ text, audience, context, detected, regionPref });
    const safety = scanSafety(text);
    out = { ...fallback, safety };
  }

  // ✅ learnNow: phrases FE can push to deck
  out.learnNow = [...new Set((out.detected || []).map((d) => d.phrase))];

  // 6) respond + 7) cache
  cache.set(key, out);
  return res.json(out);
});

function buildPrompt({ text, audience, context, regionPref, detected }) {
  // pass hints from your dictionary to improve LLM reliability
  const hints = (detected || []).map((e) => ({
    phrase: e.phrase,
    region: Array.isArray(e.regions) && e.regions.length ? e.regions[0] : "global",
    gloss: Array.isArray(e.meanings) && e.meanings.length ? e.meanings[0] : "",
  }));

  return `
        You are a culturally sensitive slang translator.
        Return strict JSON with keys:
        - detected: array of { "phrase": string, "region": string }
        - plain: short meaning (<= 20 words)
        - audienceRewrite: rewrite tuned to audience and context
        - notes: array of short bullets (origin/nuance/safe use)
        - safety: { "sensitive": boolean }

        Rules:
        - Keep "plain" one short sentence, neutral.
        - No slurs in rewrites (neutralize if needed).
        - Audience: ${audience}; Context: ${context}; Region preference: ${regionPref || "global"}.
        Input: """${text}"""
        Dictionary hints: ${JSON.stringify(hints)}
        `;
}

export default router;
