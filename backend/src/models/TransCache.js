import { Schema, model } from "mongoose";
const TransCacheSchema = new Schema(
  {
    key: { type: String, unique: true }, // sha256 of normalized request
    base: { type: Object, required: true }, // { detected, plain, notes, safety }
    // optional: store audience/context rewrites if you want
    // rewrites: { genz_chat: "...", millennial_email: "..." }
    expiresAt: { type: Date, index: { expires: "30d" } }, // TTL 30 days
  },
  { timestamps: true }
);

export default model("TransCache", TransCacheSchema);
