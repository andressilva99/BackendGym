import { Request, Response } from "express";
import { BookingModel } from "../models/booking.model";
import { TimesLotModel, State } from "../models/timesLot.model";
import { sendBookingEmails } from "../services/email.service";

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
