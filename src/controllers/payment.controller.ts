import { Request, Response } from "express";
import { PaymentModel } from "../models/payment.model";
import { SocioModel } from "../models/socio.model";
import { ShareModel } from "../models/share.model";

// "2026-09" → { year: 2026, month: 9 } (null si el formato no es válido)
const parsePeriod = (value: unknown) => {
  const match = /^(\d{4})-(\d{1,2})$/.exec(String(value ?? ""));
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year: Number(match[1]), month } : null;
};

// GET /payments
// Filtros opcionales: year, month, isPaid (true|false) y/o un rango de meses
// from=YYYY-MM & to=YYYY-MM (ambos incluidos)
export const getPayments = async (req: Request, res: Response) => {
  const { year, month, from, to, isPaid } = req.query;

  const filter: any = {};
  if (year) filter.year = Number(year);
  if (month) filter.month = Number(month);
  if (isPaid === "true" || isPaid === "false") filter.isPaid = isPaid === "true";

  const range: any[] = [];
  const fromPeriod = parsePeriod(from);
  const toPeriod = parsePeriod(to);
  if (fromPeriod) {
    range.push({ $or: [{ year: { $gt: fromPeriod.year } }, { year: fromPeriod.year, month: { $gte: fromPeriod.month } }] });
  }
  if (toPeriod) {
    range.push({ $or: [{ year: { $lt: toPeriod.year } }, { year: toPeriod.year, month: { $lte: toPeriod.month } }] });
  }
  if (range.length) filter.$and = range;

  const payments = await PaymentModel.find(filter)
    .populate({
      path: "socioId",
      select: "apellido nombre trainerId",
      populate: {
        path: "trainerId",
        select: "username"
      }
    })
    .populate("shareId", "amount numberDays quoteDate")
    .sort({ year: -1, month: -1 });

  res.json(payments);
};

// POST /payments
export const createPayment = async (req: Request, res: Response) => {
  const { socioId, shareId, year, month } = req.body;

  if (!socioId || !shareId || !year || !month) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  const socio = await SocioModel.findById(socioId);
  if (!socio) {
    return res.status(404).json({ message: "Socio no encontrado" });
  }

  const share = await ShareModel.findById(shareId);
  if (!share) {
    return res.status(404).json({ message: "Cuota no encontrada" });
  }

  const exists = await PaymentModel.findOne({ socioId, year, month });
  if (exists) {
    return res.status(400).json({ message: "Pago duplicado" });
  }

  const payment = await PaymentModel.create({
    socioId,
    shareId,
    year,
    month,
    isPaid: false,
    paymentDate: null,
    amount: share.amount,
    numberDays: share.numberDays
  });

  res.status(201).json(payment);
};

// POST /payments/generate
export const generatePayments = async (req: Request, res: Response) => {
  const { year, month, shareId, socioIds } = req.body;

  if (!year || !month || !shareId) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  const share = await ShareModel.findById(shareId);
  if (!share) {
    return res.status(404).json({ message: "Cuota no encontrada" });
  }
  if (share.active === false) {
    return res.status(400).json({ message: "La cuota seleccionada está inactiva" });
  }

  const socios = socioIds?.length
    ? await SocioModel.find({ _id: { $in: socioIds } })
    : await SocioModel.find();

  let created = 0;

  for (const socio of socios) {
    const exists = await PaymentModel.findOne({
      socioId: socio._id,
      year,
      month
    });

    if (!exists) {
      await PaymentModel.create({
        socioId: socio._id,
        shareId,
        year,
        month,
        amount: share.amount,
        numberDays: share.numberDays
      });
      created++;
    }
  }

  res.json({ message: "Pagos generados", created });
};

// PATCH /payments/:id/toggle
export const togglePayment = async (req: Request, res: Response) => {
  const payment = await PaymentModel.findById(req.params.id);
  if (!payment) {
    return res.status(404).json({ message: "Pago no encontrado" });
  }

  payment.isPaid = !payment.isPaid;
  payment.paymentDate = payment.isPaid ? new Date() : null;

  // Pago viejo sin "foto": al cobrarlo congelamos el valor de su cuota en ese momento
  if (payment.isPaid && payment.amount == null) {
    const share = await ShareModel.findById(payment.shareId);
    if (share) {
      payment.amount = share.amount;
      payment.numberDays = share.numberDays;
    }
  }

  await payment.save();
  res.json(payment);
};

// 🔥 PATCH /payments/:id (EDITAR CUOTA)
export const updatePayment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { shareId } = req.body;

  const payment = await PaymentModel.findById(id);
  if (!payment) {
    return res.status(404).json({ message: "Pago no encontrado" });
  }

  if (payment.isPaid) {
    return res
      .status(400)
      .json({ message: "No se puede editar un pago abonado" });
  }

  if (shareId) {
    const share = await ShareModel.findById(shareId);
    if (!share) {
      return res.status(404).json({ message: "Cuota no encontrada" });
    }
    if (share.active === false && String(payment.shareId) !== String(shareId)) {
      return res.status(400).json({ message: "La cuota seleccionada está inactiva" });
    }
    payment.shareId = shareId;
    payment.amount = share.amount;
    payment.numberDays = share.numberDays;
  }

  await payment.save();
  res.json(payment);
};

// DELETE /payments/:id
export const deletePayment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const payment = await PaymentModel.findByIdAndDelete(id);

  if (!payment) {
    return res.status(404).json({ message: "Pago no encontrado" });
  }

  res.json({ message: "Pago eliminado correctamente" });
};