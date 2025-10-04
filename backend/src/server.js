import "dotenv/config";
import express from "express";
import cors from "cors";
import translateRoute from "./routes/translate.js";
import { connectDB } from "./db/connect.js";
import pkg from "express-openid-connect";
import path from "path";

const { auth, requiresAuth } = pkg;
await connectDB();

const app = express();
app.use(express.json());

const ALLOWED_ORIGIN =
  (process.env.ALLOW_ORIGIN && process.env.ALLOW_ORIGIN.replace(/\/$/, "")) || "http://localhost:5173";

app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    credentials: true,
  })
);

app.use(
  auth({
    issuerBaseURL: process.env.ISSUER_BASE_URL,
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    secret: process.env.SESSION_SECRET,
    authRequired: false,
    authorizationParams: { response_type: "code" },
  })
);

app.get("/api/check-login", (req, res) => {
  res.json({ loggedIn: req.oidc?.isAuthenticated() === true });
});

const __dirname = path.resolve();

app.get("/", (req, res) => {
  if (req.oidc.isAuthenticated()) {
    return res.redirect("http://localhost:5173/profile");
  }
  return res.redirect("http://localhost:5173/loggedout");
});
app.get("/profile", requiresAuth(), (req, res) => {
  res.send(JSON.stringify(req.oidc.user));
});

app.get("/api/health", (_, res) => res.json({ ok: true }));
app.use("/api/translate", translateRoute);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
  });
}

// Return profile if logged in
app.get('/api/me', requiresAuth(), (req, res) => {
  res.json(req.oidc.user); // { name, email, sub, picture, ... }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
