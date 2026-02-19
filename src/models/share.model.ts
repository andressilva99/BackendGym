import { Schema, model, Document, Types } from "mongoose";

export interface Share extends Document {
  numberDays: number;
  amount: number;
  quoteDate: Date;
}

const shareSchema = new Schema<Share>(
  {
    numberDays: {
      type: Number,
      required: true,
      //trim: true
    },
    amount: {
      type: Number,
      required: true,
      //trim: true
    },
    quoteDate: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

export const ShareModel = model<Share>("Cuota", shareSchema, "cuota");