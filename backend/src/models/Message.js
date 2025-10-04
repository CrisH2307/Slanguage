import { Schema, model, Types } from "mongoose";

const DetectedSchema = new Schema(
  {
    phrase: String,
    region: String,
  },
  { _id: false }
);

const TranslationSchema = new Schema(
  {
    detected: [DetectedSchema],
    plain: String,
    audienceRewrite: String,
    notes: [String],
    safety: { sensitive: Boolean, label: String },
  },
  { _id: false }
);

const MessageSchema = new Schema(
  {
    roomId: { type: Types.ObjectId, ref: "Room", index: true },
    userId: { type: Types.ObjectId, ref: "User", index: true },
    text: { type: String, required: true },
    translation: TranslationSchema, // set after /api/translate runs
    srcHash: { type: String, index: true }, // normalize(text+region) → hash
  },
  { timestamps: true }
);

MessageSchema.index({ roomId: 1, createdAt: 1 }); // fast room feed

export default model("Message", MessageSchema);
