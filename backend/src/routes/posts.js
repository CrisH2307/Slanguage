import express from "express";
import Post from "../models/Post.js";

const router = express.Router();

// GET /api/threads  (aka all posts/threads)
router.get("/", async (_req, res) => {
  const docs = await Post.find({})
    .sort({ createdAt: -1 })        // newest first
    .lean();
  res.json(docs);
  console.log("fetched posts:", docs);
});

// GET /api/posts/:id  (aka single thread)
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.status(404).json({ error: "Thread not found" });
    res.json(post);
    console.log("fetched single post:", post);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

export default router;