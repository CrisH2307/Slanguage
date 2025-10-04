import { Schema, model } from "mongoose";
const SuggestionSchema = new Schema(
  {
    phrase: String,
    meaning: String,
    region: String,
    example: String,
    notes: String,
    contact: String,
    status: { type: String, enum: ["new", "reviewed", "approved", "rejected"], default: "new" },
  },
  { timestamps: true }
);
SuggestionSchema.index({ status: 1, createdAt: -1 });
export default model("Suggestion", SuggestionSchema);
