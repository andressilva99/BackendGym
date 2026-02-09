import { Request, Response } from "express";
import { PaymentModel } from "../models/payment.model";
import { SocioModel } from "../models/socio.model";
import { ShareModel } from "../models/share.model";

// GET /payments
export const getPayments = async (req: Request, res: Response) => {
  const { year, month } = req.query;

  const filter: any = {};
  if (year) filter.year = Number(year);
  if (month) filter.month = Number(month);

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
    paymentDate: null
  });

  res.status(201).json(payment);
};

// POST /payments/generate
export const generatePayments = async (req: Request, res: Response) => {
  const { year, month, shareId, socioIds } = req.body;

  if (!year || !month || !shareId) {
    return res.status(400).json({ message: "Faltan datos" });
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
        month
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
    payment.shareId = shareId;
  }

  await payment.save();
  res.json(payment);
};