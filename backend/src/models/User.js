import { Schema, model } from "mongoose";
const UserSchema = new Schema(
  {
    uid: { type: String, index: true, unique: true }, // auth id
    displayName: String,
    generation: { type: String, enum: ["genz", "millennial"] },
    regionPref: { type: String, enum: ["toronto", "indian_eng", "chinese_eng", "global"], default: "global" },
  },
  { timestamps: true }
);
export default model("User", UserSchema);
