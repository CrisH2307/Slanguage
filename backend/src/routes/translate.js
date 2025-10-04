// Transactional routes for translation
import express from "express";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { detectSlang, dict } from "../lib/detect.js";
import { composeFallback } from "../lib/compose.js";
import { scanSafety } from "../lib/safety.js";

const router = express.Router();
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Validate input
const Body = z.object({
  text: z.string().min(1),
  audience: z.enum(["genz", "millennial"]).default("millennial"),
  context: z.enum(["chat", "email"]).default("chat"),
  regionPref: z.enum(["toronto", "indian_eng", "chinese_eng", "global"]).optional(),
});

router.post("/", async (req, res) => {
  const parse = Body.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Bad request", issues: parse.error.issues });

  const { text, audience, context, regionPref } = parse.data;

  // Detect slang with dictionary (fast, offline)
  const detected = detectSlang(text);

  // Try Gemini (within timeout), but ALWAYS have fallback
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1600);

    if (!genAI) throw new Error("No GEMINI_API_KEY");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = buildPrompt({ text, audience, context, regionPref, detected });
    const result = await model.generateContent(
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      },
      { signal: controller.signal }
    );

    clearTimeout(t);

    const raw = result.response?.text();
    const parsed = JSON.parse(raw);

    // Minimal shape check
    if (!parsed || !parsed.plain || !parsed.audienceRewrite) throw new Error("Invalid LLM JSON");

    // Merge in safety
    const safety = scanSafety(text);
    return res.json({ ...parsed, safety });
  } catch (e) {
    // Fallback compose
    const fallback = composeFallback({ text, audience, context, detected });
    // If nothing detected, still attach generic safety scan
    const safety = scanSafety(text);
    return res.json({ ...fallback, safety });
  }
});

function buildPrompt({ text, audience, context, regionPref, detected }) {
  const dictPayload = detected.map((e) => ({
    phrase: e.phrase,
    gloss: e.meanings?.[0] || "",
    region: e.regions?.[0] || "global",
  }));

  return `You are a culturally sensitive slang translator. 
          Return JSON with keys: detected[], plain, audienceRewrite, notes[], safety:{sensitive:boolean}.
          - Keep "plain" <= 20 words.
          - "audienceRewrite" should match audience=${audience}, context=${context}.
          - If content is offensive, set safety.sensitive=true and avoid slurs in rewrites.
          Input text: "${text}"
          Region preference: ${regionPref || "global"}
          Dictionary hints (optional): ${JSON.stringify(dictPayload)}`;
}

export default router;
