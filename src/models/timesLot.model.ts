import { Schema, model, Document, Types } from "mongoose";

export enum State {
  AVAILABLE = "LIBRE",
  BOOKED = "OCUPADO",
}

export interface TimesLot extends Document {
  courtId: Types.ObjectId;
  date: Date;
  startTime: string;     // e.g: "09:00"
  endTime: string;       // e.g: "10:00"
  status: State;
  priceId: Types.ObjectId;     // reference to the Price valid at that time
}

const timesLotSchema = new Schema<TimesLot>(
  {
    courtId: {
      type: Schema.Types.ObjectId,
      ref: "Cancha",
      required: true
    }, 
     date: {
      type: Date,
      required: true,
      //trim: true
    },
    startTime: {
      type: String,
      required: true,
      trim: true
    },
     endTime: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(State),
      required: true
    },
    priceId: {
      type: Schema.Types.ObjectId,
      ref: "Precio",
      required: true
    },
  },
  { timestamps: true }
);

export const TimesLotModel = model<TimesLot>("Turno", timesLotSchema, "turnos");