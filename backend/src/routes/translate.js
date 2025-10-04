import express from "express";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { detectSlang } from "../lib/detect.js"; // your dictionary matcher
import { composeFallback } from "../lib/compose.js"; // rule-based composer
import { scanSafety } from "../lib/safety.js"; // simple content scan

// ----- OPTIONAL: tiny in-memory cache (safe even without Mongo) -----
const cache = new Map();
const cacheKey = ({ text, audience, context, regionPref }) =>
  JSON.stringify({
    t: text.trim().toLowerCase().replace(/\s+/g, " "),
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

  // 3) detect slang (fast, offline)
  const detected = detectSlang(text, { regionPref });

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

    const raw = result?.response?.text?.();
    const parsedJSON = JSON.parse(raw || "{}");

    // minimal shape check—if bad, we fallback
    if (!parsedJSON?.plain || !parsedJSON?.audienceRewrite) throw new Error("Invalid LLM JSON");

    // add safety scan (local)
    const safety = scanSafety(text);
    out = { ...parsedJSON, safety };
  } catch {
    // 5) fallback compose (always works)
    const fallback = composeFallback({ text, audience, context, detected, regionPref });
    const safety = scanSafety(text);
    out = { ...fallback, safety };
  }

  // 6) respond + 7) cache
  cache.set(key, out);
  return res.json(out);
});

function buildPrompt({ text, audience, context, regionPref, detected }) {
  // pass hints from your dictionary to improve LLM reliability
  const hints = detected.map((e) => ({
    phrase: e.phrase,
    region: e.regions?.[0] || "global",
    gloss: e.meanings?.[0] || "",
  }));

  return `
        You are a culturally sensitive slang translator. Output strict JSON with keys:
        - detected: array of { "phrase": string, "region": string }
        - plain: short meaning (<= 20 words)
        - audienceRewrite: rewrite tuned to audience and context
        - notes: array of short bullets (origin/nuance/safe use)
        - safety: { "sensitive": boolean }

        Rules:
        - Do not include slurs in rewrites; if content is sensitive, set safety.sensitive=true.
        - Keep "plain" one short sentence. Be neutral and non-judgmental.
        - Audience: ${audience}; Context: ${context}; Region preference: ${regionPref || "global"}.

        Input text: """${text}"""
        Dictionary hints: ${JSON.stringify(hints)}
        `;
}

export default router;
