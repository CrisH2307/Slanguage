import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  { user: String, text: String },
  { _id: false, timestamps: true }
);

const PostSchema = new mongoose.Schema(
  {
    user: String,          // e.g. "khangpicasso@gmail.com"
    title: { type: String, required: true },
    comments: { type: [CommentSchema], default: [] },
  },
  { timestamps: true }     // gives you createdAt / updatedAt like in your screenshot
);

export default mongoose.model("Post", PostSchema, "posts"); // <-- collection: posts