import { Request, Response } from "express";
import { BookingModel } from "../models/booking.model";
import { TimesLotModel, State } from "../models/timesLot.model";
import { sendBookingEmails } from "../services/email.service";

// Minutos antes del inicio en que se cierra la reserva de un turno (configurable en Render)
const BOOKING_CUTOFF_MINUTES = Number(process.env.BOOKING_CUTOFF_MINUTES) || 5;

// Argentina está en UTC-3 todo el año (sin horario de verano)
const ARGENTINA_UTC_OFFSET_HOURS = 3;

// El turno guarda la fecha como medianoche UTC del día ("2026-09-26T00:00:00Z") y la hora
// como texto en hora argentina ("13:00"). Armamos el instante real de inicio para comparar
// con la hora del servidor, sin depender del reloj del celular del cliente.
const isBookingClosed = (date: Date, startTime: string) => {
  const day = new Date(date);
  const [hours, minutes] = startTime.split(":").map(Number);
  const startsAt = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    hours + ARGENTINA_UTC_OFFSET_HOURS,
    minutes
  );
  return Date.now() >= startsAt - BOOKING_CUTOFF_MINUTES * 60_000;
};

/* ===== GET /bookings ===== */
export const getBookings = async (req: Request, res: Response) => {
  const { date, dni } = req.query;

  const filter: any = {};
  if (dni) filter.dni = Number(dni);
  if (date) {
    const day = new Date(String(date));
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.date = { $gte: day, $lt: nextDay };
  }

  const bookings = await BookingModel.find(filter).sort({ date: -1, startTime: 1 });
  res.json(bookings);
};

/* ===== POST /bookings ===== */
export const createBooking = async (req: Request, res: Response) => {
  const { timeslotId, firstName, lastName, dni, email, whatsapp } = req.body;

  if (!timeslotId || !firstName || !lastName || !dni || !email || !whatsapp) {
    return res.status(400).json({ message: "Faltan datos obligatorios" });
  }

  const timeslot = await TimesLotModel.findById(timeslotId)
    .populate<{ courtId: { name: string } }>("courtId", "name")
    .populate<{ priceId: { amount: number } }>("priceId", "amount");

  if (!timeslot) {
    return res.status(404).json({ message: "Turno no encontrado" });
  }

  if (timeslot.status !== State.AVAILABLE) {
    return res.status(400).json({ message: "El turno ya no está disponible" });
  }

  if (isBookingClosed(timeslot.date, timeslot.startTime)) {
    return res.status(400).json({
      code: "BOOKING_CLOSED",
      message: `Las reservas de este turno ya cerraron: se puede reservar hasta ${BOOKING_CUTOFF_MINUTES} minutos antes del horario de inicio.`
    });
  }

  const court = timeslot.courtId as unknown as { name: string };
  const price = timeslot.priceId as unknown as { amount: number };

  const booking = await BookingModel.create({
    timeslotId: timeslot._id,
    firstName,
    lastName,
    dni,
    email,
    whatsapp,
    courtName: court.name,
    date: timeslot.date,
    startTime: timeslot.startTime,
    endTime: timeslot.endTime,
    paidAmount: price.amount,
    bookingDate: new Date()
  });

  timeslot.status = State.BOOKED;
  await timeslot.save();

  // Respondemos apenas la reserva queda guardada; los emails se envían en segundo plano
  // para que el cliente no espere al servidor de correo.
  res.status(201).json(booking);

  sendBookingEmails({
    firstName,
    lastName,
    email,
    whatsapp,
    courtName: court.name,
    date: timeslot.date,
    startTime: timeslot.startTime,
    endTime: timeslot.endTime,
    paidAmount: price.amount
  }).catch((error) => {
    console.error("❌ Error enviando emails de confirmación de turno:", error);
  });
};

/* ===== GET /bookings/unseen ===== */
export const getUnseenBookings = async (_req: Request, res: Response) => {
  const bookings = await BookingModel.find({ seenByAdmin: false }).sort({ bookingDate: -1 });
  res.json({ count: bookings.length, bookings });
};

/* ===== PATCH /bookings/seen-all ===== */
export const markAllBookingsSeen = async (_req: Request, res: Response) => {
  await BookingModel.updateMany({ seenByAdmin: false }, { seenByAdmin: true });
  res.json({ message: "Reservas marcadas como vistas" });
};

/* ===== PATCH /bookings/:id/seen ===== */
export const markBookingSeen = async (req: Request, res: Response) => {
  const booking = await BookingModel.findByIdAndUpdate(
    req.params.id,
    { seenByAdmin: true },
    { new: true }
  );

  if (!booking) {
    return res.status(404).json({ message: "Reserva no encontrada" });
  }

  res.json(booking);
};

/* ===== DELETE /bookings/:id ===== */
export const deleteBooking = async (req: Request, res: Response) => {
  const booking = await BookingModel.findByIdAndDelete(req.params.id);

  if (!booking) {
    return res.status(404).json({ message: "Reserva no encontrada" });
  }

  await TimesLotModel.findByIdAndUpdate(booking.timeslotId, {
    status: State.AVAILABLE
  });

  res.json({ message: "Reserva cancelada correctamente" });
};
