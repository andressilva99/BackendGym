import { Schema, model, Document, Types } from "mongoose";

export interface Payment extends Document {
  socioId: Types.ObjectId;
  shareId: Types.ObjectId;
  year: number;
  month: number; // 1..12
  isPaid: boolean;
  paymentDate?: Date | null;
}

const paymentSchema = new Schema<Payment>(
  {
    socioId: {
      type: Schema.Types.ObjectId,
      ref: "Socio",
      required: true
    },
    shareId: {
      type: Schema.Types.ObjectId,
      ref: "Cuota", // OJO: tu modelo Share usa nombre "Cuota"
      required: true
    },
    year: {
      type: Number,
      required: true
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paymentDate: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Evita duplicados: 1 pago por socio + año + mes
paymentSchema.index({ socioId: 1, year: 1, month: 1 }, { unique: true });

export const PaymentModel = model<Payment>("Pago", paymentSchema, "pagos");