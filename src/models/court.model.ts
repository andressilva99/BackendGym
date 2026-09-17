import { Schema, model, Document } from "mongoose";

export interface Court extends Document {
  number: number;
  name: string;          // e.g: "Court 1 - Padel", "Court 2 - Gym"
  type: string;          // "padel" | "gym"
  active: boolean;
}

const courtSchema = new Schema<Court>(
  {
     number: {
      type: Number,
      required: true,
      //trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
     type: {
      type: String,
      required: true,
      trim: true
    },
    active: {
      type: Boolean,
      default: false
    },
  },
  { timestamps: true }
);

export const CourtModel = model<Court>("Cancha", courtSchema, "canchas");