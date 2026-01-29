import { Request, Response } from "express";
import { ShareModel } from "../models/share.model";

/* ===== GET /shares ===== */
export const getShares = async (_req: Request, res: Response) => {
  const shares = await ShareModel.find();
  res.json(shares);
};

/* ===== POST /shares ===== */
export const createShare = async (req: Request, res: Response) => {
  const { numberDays, amount, quoteDate } = req.body;

  if (!numberDays || !amount || !quoteDate) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  const share = new ShareModel({
    numberDays,
    amount,
    quoteDate
  });

  await share.save();
  res.status(201).json(share);
};

/* ===== PUT /shares/:id ===== */
export const updateShare = async (req: Request, res: Response) => {
  const share = await ShareModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  if (!share) {
    return res.status(404).json({ message: "Cuota no encontrada" });
  }

  res.json(share);
};

/* ===== DELETE /shares/:id ===== */
export const deleteShare = async (req: Request, res: Response) => {
  const share = await ShareModel.findByIdAndDelete(req.params.id);

  if (!share) {
    return res.status(404).json({ message: "Cuota no encontrada" });
  }

  res.json({ message: "Cuota eliminada" });
};
