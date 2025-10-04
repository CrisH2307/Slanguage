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

export default router;