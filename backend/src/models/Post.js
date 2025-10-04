import { Schema, model, Types } from "mongoose";
const PostSchema = new Schema(
  {
    user: { type: String, required: true },
    title: { type: String, required: true },
    comments: [
        {
            user: { type: String, required: true },
            text: { type: String, required: true },
            default: []
        }, 
    ]
  },
  { timestamps: true }
);
export default model("Post", PostSchema);
