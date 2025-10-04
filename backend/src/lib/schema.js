// src/lib/schema.js
import { z } from "zod";

export const LLMRes = z.object({
  detected: z.array(z.object({ phrase: z.string(), region: z.string() })).default([]),
  plain: z.string().min(1),
  audienceRewrite: z.string().min(1),
  notes: z.array(z.string()).default([]),
  safety: z.object({ sensitive: z.boolean(), label: z.string().optional() }),
});

export function validateLLM(raw) {
  try {
    const obj = JSON.parse(raw || "{}");
    return { ok: true, out: LLMRes.parse(obj) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
