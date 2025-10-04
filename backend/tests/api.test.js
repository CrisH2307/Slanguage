// tests/api.test.js
import { vi, beforeAll, describe, it, expect } from "vitest";
import request from "supertest";
import "dotenv/config";

vi.mock("express-openid-connect", () => {
  const passthrough = () => (req, res, next) => next();
  return {
    default: { auth: passthrough, requiresAuth: passthrough },
    auth: passthrough,
    requiresAuth: passthrough,
  };
});

const agent = request("http://localhost:3000");

beforeAll(async () => {
  process.env.GEMINI_API_KEY = "";
  // Wait for server to be up: poll /api/health briefly
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < 5000) {
    try {
      const r = await agent.get("/api/health");
      if (r.status === 200) return;
    } catch (e) { lastErr = e; }
    await new Promise(r => setTimeout(r, 150));
  }
  if (lastErr) throw lastErr;
}, 20_000);

describe("Routes", () => {
  it("GET /api/health => { ok: true }", async () => {
    const r = await agent.get("/api/health").expect(200);
    expect(r.body).toEqual({ ok: true });
  });

  it("POST /api/users/upsert saves a user", async () => {
    const body = {
      uid: "u_cris_1",
      displayName: "Cris",
      generation: "millennial",
      regionPref: "toronto",
    };
    const r = await agent.post("/api/users/upsert").send(body).expect(200);
    expect(r.body.uid).toBe(body.uid);
    expect(r.body.displayName).toBe(body.displayName);
    expect(r.body.generation).toBe("millennial");
  });

  it("POST /api/translate returns expected shape", async () => {
    const payload = {
      text: "mans got bare jokes no cap",
      audience: "millennial",
      context: "chat",
      regionPref: "toronto",
    };
    const r = await agent.post("/api/translate").send(payload).expect(200);
    expect(r.body).toHaveProperty("detected");
    expect(Array.isArray(r.body.detected)).toBe(true);
    expect(r.body).toHaveProperty("plain");
    expect(r.body).toHaveProperty("audienceRewrite");
    expect(r.body).toHaveProperty("notes");
    expect(r.body).toHaveProperty("safety");
    expect(r.body).toHaveProperty("learnNow");
    // sanity: at least one detected term
    expect(r.body.detected.length).toBeGreaterThan(0);
  });

  it("POST /api/messages stores a message with translation", async () => {
    const payload = {
      uid: "u_cris_1",
      user: "Cris",
      text: "mans got bare jokes no cap",
      audience: "millennial",
      context: "chat",
      regionPref: "toronto",
    };
    const r = await agent.post("/api/messages").send(payload).expect(201);
    expect(r.body.text).toBe(payload.text);
    // embedded translation present
    expect(r.body).toHaveProperty("translation");
    expect(r.body.translation).toHaveProperty("plain");
    expect(r.body.translation).toHaveProperty("audienceRewrite");
  });

  it("GET /api/messages returns array sorted by time", async () => {
    const r = await agent.get("/api/messages?limit=50").expect(200);
    expect(Array.isArray(r.body)).toBe(true);
    // check ascending by createdAt if at least 2
    if (r.body.length >= 2) {
      const a = new Date(r.body[0].createdAt).getTime();
      const b = new Date(r.body[1].createdAt).getTime();
      expect(a <= b).toBe(true);
    }
  });

  it("LLM fallback is fast (< 1600ms)", async () => {
    const t0 = Date.now();
    await agent.post("/api/translate").send({
      text: "add oil 😂 fr",
      audience: "genz",
      context: "chat",
      regionPref: "chinese_eng",
    }).expect(200);
    const dt = Date.now() - t0;
    expect(dt).toBeLessThan(1600 + 400); // a bit of buffer for CI
  });
});