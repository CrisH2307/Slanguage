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
  baseURL: 'http://localhost:4000',
  clientID: 'cOdcDX4wUmAm2Rx22DyyxJJGFugkapQe',
  issuerBaseURL: 'https://dev-w8zkm8zvg0r3lhgo.us.auth0.com'
};

app.use(auth(config));

app.use(
  cors({
    origin: process.env.ALLOW_ORIGIN || "*",
    credentials: true,
  })
);
const __dirname = path.resolve();

app.get('/', (req, res) => {
  res.send(req.oidc.isAuthenticated() ? res.redirect("http://localhost:5173/profile") : res.redirect("http://localhost:5173/loggedout"));
});
app.get("/profile", requiresAuth(), (req, res) => {
  res.json(JSON.stringify(req.oidc.user));x
});
app.get("/api/check-login", (req, res) => {
  if (req.oidc.isAuthenticated()) {
    res.json({ loggedIn: true, user: req.oidc.user }); // user info from Auth0
  } else {
    res.json({ loggedIn: false });
  }
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

