import "dotenv/config";
import express from "express";
import cors from "cors";
import translateRoute from "./routes/translate.js";
import { connectDB } from "./db/connect.js";
import pkg from "express-openid-connect";
const { auth, requiresAuth } = pkg;
import path from "path"

await connectDB();

const app = express();
app.use(express.json());

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: "http://localhost:4000",
  clientID: "cOdcDX4wUmAm2Rx22DyyxJJGFugkapQe",
  issuerBaseURL: process.env.AUTH0_DOMAIN_KEY,
};

app.use(auth(config));

app.use(
  cors({
    origin: process.env.ALLOW_ORIGIN?.split(",") || "*",
  })
);
const __dirname = path.resolve();

app.get("/profile", requiresAuth(), (req, res) => {
  res.send(JSON.stringify(req.oidc.user));
});

app.get("/api/health", (_, res) => res.json({ ok: true }));
app.use("/api/translate", translateRoute);

if(process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/dist")))

  app.get('/{*any}', (req, res) => {
      res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"))
  })
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));

