import "dotenv/config";
import express from "express";
import cors from "cors";
import translateRoute from "./routes/translate.js";
import { connectDB } from "./db/connect.js";
import pkg from "express-openid-connect";
const { auth, requiresAuth } = pkg;

await connectDB();

const app = express();
app.use(express.json());

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: "http://localhost:4000",
  clientID: "cOdcDX4wUmAm2Rx22DyyxJJGFugkapQe",
  issuerBaseURL: "https://dev-w8zkm8zvg0r3lhgo.us.auth0.com",
};

app.use(auth(config));

app.use(
  cors({
    origin: process.env.ALLOW_ORIGIN?.split(",") || "*",
  })
);

app.get("/", (req, res) => {
  res.send(req.oidc.isAuthenticated() ? "Logged in" : "User is not signed in");
});

app.get("/profile", requiresAuth(), (req, res) => {
  res.send(JSON.stringify(req.oidc.user));
});

app.get("/api/health", (_, res) => res.json({ ok: true }));
app.use("/api/translate", translateRoute);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
