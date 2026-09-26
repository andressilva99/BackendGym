import { Request, Response } from "express";
import { ShareModel } from "../models/share.model";

/* ===== GET /shares ===== */
// ?active=true → solo activas. Se filtra por "no desactivada" para incluir las cuotas viejas
// que no tienen el campo active guardado.
export const getShares = async (req: Request, res: Response) => {
  const filter = req.query.active === "true" ? { active: { $ne: false } } : {};
  const shares = await ShareModel.find(filter);
  res.json(shares);
};

/* ===== POST /shares ===== */
export const createShare = async (req: Request, res: Response) => {
  const { numberDays, amount, quoteDate, active } = req.body;

  // 🔹 CORRECCIÓN: Verificamos que no sean undefined o null. 
  // Antes, if(!amount) fallaba si amount era 0.
  if (numberDays === undefined || amount === undefined || !quoteDate) {
    return res.status(400).json({ message: "Faltan datos obligatorios" });
  }

  const share = new ShareModel({
    numberDays,
    amount,
    quoteDate,
    active: active ?? true
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
