import { Request, Response } from "express";
import { TimesLotModel, State } from "../models/timesLot.model";
import { CourtModel } from "../models/court.model";
import { PriceModel } from "../models/price.model";

// "13:30" → 810
const toMinutes = (time: string) => {
  const [h, m] = String(time).split(":").map(Number);
  return h * 60 + m;
};

/* ===== GET /timeslots ===== */
export const getTimesLots = async (req: Request, res: Response) => {
  const { courtId, date, status } = req.query;

  const filter: any = {};
  if (courtId) filter.courtId = courtId;
  if (status) filter.status = status;
  if (date) {
    const day = new Date(String(date));
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.date = { $gte: day, $lt: nextDay };
  }

  const timeslots = await TimesLotModel.find(filter)
    .populate("courtId", "number name type")
    .populate("priceId", "amount description")
    .sort({ date: 1, startTime: 1 });

  res.json(timeslots);
};

/* ===== POST /timeslots ===== */
export const createTimesLot = async (req: Request, res: Response) => {
  const { courtId, date, startTime, endTime, priceId } = req.body;

  if (!courtId || !date || !startTime || !endTime || !priceId) {
    return res.status(400).json({ message: "Faltan datos obligatorios" });
  }

  const court = await CourtModel.findById(courtId);
  if (!court) {
    return res.status(404).json({ message: "Cancha no encontrada" });
  }

  const price = await PriceModel.findById(priceId);
  if (!price) {
    return res.status(404).json({ message: "Precio no encontrado" });
  }

  if (toMinutes(endTime) <= toMinutes(startTime)) {
    return res.status(400).json({ message: "La hora de fin debe ser posterior a la de inicio" });
  }

  // No se permiten turnos repetidos ni superpuestos en la misma cancha y el mismo día
  const day = new Date(date);
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);
  const sameDay = await TimesLotModel.find({ courtId, date: { $gte: day, $lt: nextDay } });
  const clash = sameDay.find(
    (s) => toMinutes(startTime) < toMinutes(s.endTime) && toMinutes(s.startTime) < toMinutes(endTime)
  );
  if (clash) {
    return res.status(409).json({
      code: "TIMESLOT_OVERLAP",
      message: `El turno ${startTime} - ${endTime} se superpone con el turno existente ${clash.startTime} - ${clash.endTime}`
    });
  }

  const timeslot = await TimesLotModel.create({
    courtId,
    date,
    startTime,
    endTime,
    priceId,
    status: State.AVAILABLE
  });

  res.status(201).json(timeslot);
};

/* ===== PUT /timeslots/:id ===== */
export const updateTimesLot = async (req: Request, res: Response) => {
  const { status } = req.body;

  if (status && !Object.values(State).includes(status)) {
    return res.status(400).json({ message: "Estado inválido" });
  }

  const timeslot = await TimesLotModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  if (!timeslot) {
    return res.status(404).json({ message: "Turno no encontrado" });
  }

  res.json(timeslot);
};

/* ===== DELETE /timeslots/:id ===== */
export const deleteTimesLot = async (req: Request, res: Response) => {
  const timeslot = await TimesLotModel.findById(req.params.id);

  if (!timeslot) {
    return res.status(404).json({ message: "Turno no encontrado" });
  }

  if (timeslot.status === State.BOOKED) {
    return res.status(400).json({ message: "No se puede eliminar un turno ya reservado" });
  }

  await timeslot.deleteOne();
  res.json({ message: "Turno eliminado correctamente" });
};
