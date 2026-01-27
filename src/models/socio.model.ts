import { Schema, model, Document, Types } from "mongoose";

export interface Socio extends Document {
  apellido: string;
  nombre: string;
  fechaNacimiento: Date;
  trainerId: Types.ObjectId; // usuario (entrenador) que lo creó
}

const socioSchema = new Schema<Socio>(
  {
    apellido: {
      type: String,
      required: true,
      trim: true
    },
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    fechaNacimiento: {
      type: Date,
      required: true
    },
    trainerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

export const SocioModel = model<Socio>("Socio", socioSchema, "socios");