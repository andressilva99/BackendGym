import { Schema, model, Document, Types } from "mongoose";

export interface Share extends Document {
  numberDays: number;
  amount: number;
  quoteDate: Date;
  active: boolean;
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
    },
    // Solo las cuotas activas se ofrecen al generar pagos. Las cuotas creadas antes de este
    // campo no lo tienen guardado: se consideran activas (ver getShares).
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export const ShareModel = model<Share>("Cuota", shareSchema, "cuota");