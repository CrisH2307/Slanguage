import { Schema, model, Types } from "mongoose";
const RoomSchema = new Schema(
  {
    name: String,
    createdBy: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
export default model("Room", RoomSchema);
