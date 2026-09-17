import { Schema, model, Document, Types } from "mongoose";

export interface Booking extends Document {
  timeslotId: Types.ObjectId;
  // Customer data
  firstName: string;
  lastName: string;
  dni: number;
  email: string;
  whatsapp: number;
  // Historical snapshot — filled automatically when the timeslot is selected
  courtName: string;
  date: Date;
  startTime: string;
  endTime: string;
  paidAmount: number;

  bookingDate: Date;     // when the booking was made
  seenByAdmin: boolean;  // whether the admin panel has acknowledged this booking
}

const bookingSchema = new Schema<Booking>(
  {
    timeslotId: {
      type: Schema.Types.ObjectId,
      ref: "Horario",
      required: true
    }, 
     // Customer data
     firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    dni: {
      type: Number,
      required: true
    },
    email: {
      type: String,
      required: true,
      trim: true
    },
    whatsapp: {
      type: Number,
      required: true
    },
    // Historical snapshot — filled automatically when the timeslot is selected
    courtName: {
      type: String,
      required: true,
      trim: true
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
    paidAmount: {
      type: Number,
      required: true
    },
    bookingDate: {
      type: Date,
      required: true,
      //trim: true
    },
    seenByAdmin: {
      type: Boolean,
      default: false
    },
  },
  { timestamps: true }
);

export const BookingModel = model<Booking>("Reserva", bookingSchema, "reservas");