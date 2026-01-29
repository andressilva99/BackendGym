import { Request, Response } from "express";
import { PaymentModel } from "../models/payment.model";
import { SocioModel } from "../models/socio.model";
import { ShareModel } from "../models/share.model";

/**
 * GET /payments?year=2026&month=1
 * Lista pagos del mes/año
 */
export const getPayments = async (req: Request, res: Response) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);

  if (!year || !month) {
    return res.status(400).json({ message: "Faltan parámetros year y month" });
  }

  const payments = await PaymentModel.find({ year, month })
    .populate("socioId", "apellido nombre")
    .populate("shareId", "numberDays amount quoteDate")
    .sort({ "socioId.apellido": 1 });

  res.json(payments);
};

/**
 * POST /payments/generate
 * Body: { year, month, shareId }
 * Crea la "tabla" del mes: un pago por cada socio (si no existe)
 */
export const generatePayments = async (req: Request, res: Response) => {
  const { year, month, shareId } = req.body;

  if (!year || !month || !shareId) {
    return res.status(400).json({ message: "Faltan datos: year, month, shareId" });
  }

  // validar share
  const share = await ShareModel.findById(shareId);
  if (!share) {
    return res.status(404).json({ message: "Cuota (share) no encontrada" });
  }

  // traer socios
  const socios = await SocioModel.find();
  if (socios.length === 0) {
    return res.status(400).json({ message: "No hay socios cargados" });
  }

  let createdCount = 0;

  for (const socio of socios) {
    try {
      // upsert: si existe no crea; si no existe crea
      const result = await PaymentModel.updateOne(
        { socioId: socio._id, year, month },
        {
          $setOnInsert: {
            socioId: socio._id,
            shareId,
            year,
            month,
            isPaid: false,
            paymentDate: null
          }
        },
        { upsert: true }
      );

      // Si insertó uno nuevo:
      if (result.upsertedCount && result.upsertedCount > 0) createdCount++;
    } catch (err: any) {
      // Si da error por duplicado (index unique), lo ignoramos
      if (err?.code !== 11000) {
        return res.status(500).json({ message: "Error generando pagos", error: String(err) });
      }
    }
  }

  res.json({
    message: "Tabla de pagos generada",
    createdCount,
    totalSocios: socios.length
  });
};

/**
 * PATCH /payments/:id/toggle
 * Cambia isPaid (true/false) y setea paymentDate
 */
export const togglePayment = async (req: Request, res: Response) => {
  const { id } = req.params;

  const payment = await PaymentModel.findById(id);
  if (!payment) {
    return res.status(404).json({ message: "Pago no encontrado" });
  }

  const newState = !payment.isPaid;

  payment.isPaid = newState;
  payment.paymentDate = newState ? new Date() : null;

  await payment.save();

  res.json(payment);
};
