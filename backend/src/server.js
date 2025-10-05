import "dotenv/config";
import express from "express";
import cors from "cors";
import translateRoute from "./routes/translate.js";
import { connectDB } from "./db/connect.js";
import pkg from "express-openid-connect";
import path from "path";
import Post from "./models/Post.js";
import getThreads from "./routes/posts.js";

const { auth, requiresAuth } = pkg;
await connectDB();

const app = express();
app.use(express.json());

const ALLOWED_ORIGIN =
  (process.env.ALLOW_ORIGIN && process.env.ALLOW_ORIGIN.replace(/\/$/, "")) ||
  "http://localhost:5173";

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

  console.log("Connected to database");

  const newPost = new Post({
    user: email,
    title: text,
  });
  await newPost.save();
  console.log("Inserted post:", newPost);
}

async function createComments(email, text, id) {
  await connectDB();

  console.log("Connected to database");

  const post = await Post.findById(id);
  post.comments.push({ user: email, text: text });
  await post.save();
  console.log("Inserted comment:", post);
}

async function showComments(id) {
  await connectDB();

  console.log("Connected to database");

  const post = await Post.findById(id);
  return post.comments;
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
  return res.redirect("http://localhost:5173/");
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
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
  });
}

// Return profile if logged in
app.get("/api/me", requiresAuth(), (req, res) => {
  res.json(req.oidc.user); // { name, email, sub, picture, ... }
});

// Threads/posts routes
app.use("/api/createthreads", requiresAuth(), (req, res) => {
  const user = req.oidc.user;
  const email = user.email;
  const text = req.body.text;
  create(email, text);
  res.json({ message: "Thread created" });
});
app.use("/api/getthreads", getThreads);

app.use("/api/createcomments", requiresAuth(), async (req, res) => {
  const user = req.oidc.user;
  const email = user.email;
  const { text, id } = req.body;
  console.log("Creating a comment", text, email, id);
  createComments(email, text, id);
  return res.json({ message: "Comment created" });
});

app.use("/api/getcomments", requiresAuth(), async (req, res) => {
  const { id } = req.body;
  const comments = await showComments(id);
  console.log("COMMS", comments);
  return res.json(comments);
}); // just reuse the posts route

app.delete("/api/deletethreads", requiresAuth(), async (req, res) => {
  const { id } = req.body;
  const user = req.oidc.user;
  const email = user.email;
  
  const post_user = await Post.findById(id);
  const post_email = post_user.user;
  console.log("Cant delete post", id, email, post_email);
  if (email !== post_email) {
    console.log("cant delete")
    return res.json({ message: "no" });
  } else {
    console.log("Deleting a post", id, email, post_email);
    await Post.findByIdAndDelete(id);
    console.log("Deleted post", id);
    return res.json({ message: "Post deleted" }, {status:400});
  }
  console.log(id, email, post_email)
  
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
