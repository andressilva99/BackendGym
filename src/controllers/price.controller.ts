import { Request, Response } from "express";
import { PriceModel } from "../models/price.model";
import { CourtModel } from "../models/court.model";

/* ===== GET /prices ===== */
export const getPrices = async (req: Request, res: Response) => {
  const { courtId } = req.query;

  const filter: any = {};
  if (courtId) filter.courtId = courtId;

  const prices = await PriceModel.find(filter).populate("courtId", "number name type");
  res.json(prices);
};

/* ===== POST /prices ===== */
export const createPrice = async (req: Request, res: Response) => {
  const { amount, description, type, courtId } = req.body;

  if (amount === undefined || !description || !type || !courtId) {
    return res.status(400).json({ message: "Faltan datos obligatorios" });
  }

  const court = await CourtModel.findById(courtId);
  if (!court) {
    return res.status(404).json({ message: "Cancha no encontrada" });
  }

  const price = await PriceModel.create({
    amount,
    description,
    type,
    courtId,
    active: true
  });

  res.status(201).json(price);
};

/* ===== PUT /prices/:id ===== */
export const updatePrice = async (req: Request, res: Response) => {
  const price = await PriceModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  if (!price) {
    return res.status(404).json({ message: "Precio no encontrado" });
  }

  res.json(price);
};

/* ===== DELETE /prices/:id ===== */
export const deletePrice = async (req: Request, res: Response) => {
  const price = await PriceModel.findByIdAndDelete(req.params.id);

  if (!price) {
    return res.status(404).json({ message: "Precio no encontrado" });
  }

  res.json({ message: "Precio eliminado correctamente" });
};
