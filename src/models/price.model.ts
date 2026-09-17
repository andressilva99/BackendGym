import { Schema, model, Document, Types } from "mongoose";

export interface Price extends Document {
  amount: number;
  description: string;          // e.g: "Court 1 - Padel", "Court 2 - Gym"
  type: string;          // "padel" | "gym"
  active: boolean;
  courtId: Types.ObjectId;
}

const priceSchema = new Schema<Price>(
  {
     amount: {
      type: Number,
      required: true,
      //trim: true
    },
    description: {
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
    courtId: {
      type: Schema.Types.ObjectId,
      ref: "Cancha",
      required: true
    }, 
  },
  { timestamps: true }
);

export const PriceModel = model<Price>("Precio", priceSchema, "precios");