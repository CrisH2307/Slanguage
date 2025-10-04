import { Schema, model, Types } from "mongoose";
const PostSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    comments: [
        {
            user: { type: Types.ObjectId, ref: "User", required: true },
            text: { type: String, required: true }
        }
    ]
  },
  { timestamps: true }
);
export default model("Post", PostSchema);
