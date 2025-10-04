import { Schema, model } from "mongoose";
const SlangEntrySchema = new Schema(
  {
    phrase: { type: String, index: true },
    variants: [String],
    regions: [String], // "toronto","indian_eng","chinese_eng","global"
    register: { type: String, enum: ["casual", "neutral", "sensitive"] },
    meanings: [String],
    rewriteTemplates: Schema.Types.Mixed, // { genz, millennial, chat, professional }
    notes: [String],
    offensive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SlangEntrySchema.index({ phrase: 1 });
SlangEntrySchema.index({ variants: 1 });

export default model("SlangEntry", SlangEntrySchema);
