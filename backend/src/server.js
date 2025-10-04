import "dotenv/config";
import express from "express";
import cors from "cors";
import translateRoute from "./routes/translate.js";
import { connectDB } from "./db/connect.js";
import pkg from "express-openid-connect";
import path from "path";
import Post from "./models/Post.js";
import threadsRouter from "./routes/posts.js";

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
    auth0Logout: true,
    authorizationParams: { response_type: "code" },
  })
);

async function create(email, text) {
    await connectDB();

    console.log('Connected to database');

    const newPost = new Post ({
      user: email,
      title: text
    })
    await newPost.save()
    console.log('Inserted post:', newPost);

}

app.get("/api/check-login", (req, res) => {
  res.json({ loggedIn: req.oidc?.isAuthenticated() === true });
});

const __dirname = path.resolve();

app.get("/", (req, res) => {
  if (req.oidc.isAuthenticated()) {
    console.log("user is authenticated");
    return res.redirect("http://localhost:5173/profile");
  }
  return res.redirect("http://localhost:5173/loggedout");
});

app.get("/profile", requiresAuth(), (req, res) => {
  console.log("Profile page");
  res.send(JSON.stringify(req.oidc.user));
});

app.get("/api/health", (_, res) => res.json({ ok: true }));
app.use("/api/translate", translateRoute);

app.post("/api/posts", requiresAuth(), (req, res) => {
  console.log("Creating a post");
  const user = req.oidc.user;
  const { text } = req.body;
  console.log("Authenticated user:", text, user);
  
  create(user.email, text);
  res.json({ message: "Post created" });
})

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

// Threads/posts routes
app.use("/api/threads", threadsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`))
