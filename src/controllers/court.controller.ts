import { Request, Response } from "express";
import { CourtModel } from "../models/court.model";

/* ===== GET /courts ===== */
export const getCourts = async (_req: Request, res: Response) => {
  const courts = await CourtModel.find().sort({ number: 1 });
  res.json(courts);
};

/* ===== POST /courts ===== */
export const createCourt = async (req: Request, res: Response) => {
  const { number, name, type } = req.body;

  if (number === undefined || !name || !type) {
    return res.status(400).json({ message: "Faltan datos obligatorios" });
  }

  const exists = await CourtModel.findOne({ number });
  if (exists) {
    return res.status(400).json({ message: "Ya existe una cancha con ese número" });
  }

  const court = await CourtModel.create({ number, name, type, active: true });
  res.status(201).json(court);
};

/* ===== PUT /courts/:id ===== */
export const updateCourt = async (req: Request, res: Response) => {
  const court = await CourtModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  if (!court) {
    return res.status(404).json({ message: "Cancha no encontrada" });
  }

  res.json(court);
};

/* ===== DELETE /courts/:id ===== */
export const deleteCourt = async (req: Request, res: Response) => {
  const court = await CourtModel.findByIdAndDelete(req.params.id);

  if (!court) {
    return res.status(404).json({ message: "Cancha no encontrada" });
  }

  res.json({ message: "Cancha eliminada correctamente" });
};
