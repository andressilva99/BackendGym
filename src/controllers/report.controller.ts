import { Request, Response } from "express";
import { PaymentModel } from "../models/payment.model";
import { UserModel } from "../models/user.model"; // para traer username del trainer

/**
 * GET /reports/summary?year=2026&month=2
 * Devuelve:
 * - general: totales del mes
 * - byTrainer: totales agrupados por entrenador
 */
export const getSummaryReport = async (req: Request, res: Response) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);

  if (!year || !month) {
    return res.status(400).json({ message: "Faltan parámetros year y month" });
  }

  // Traemos pagos del mes y populamos lo necesario
  // socioId: apellido, nombre, trainerId
  // shareId: amount, numberDays, quoteDate
  const payments = await PaymentModel.find({ year, month })
    .populate("socioId", "apellido nombre trainerId")
    .populate("shareId", "amount numberDays quoteDate")
    .lean();

  // --- helpers seguros ---
  const getShareAmount = (p: any) => {
    if (p.shareId && typeof p.shareId === "object" && p.shareId.amount != null) {
      return Number(p.shareId.amount) || 0;
    }
    return 0;
  };

  const getTrainerId = (p: any) => {
    const socio = p.socioId;
    if (socio && typeof socio === "object" && socio.trainerId) {
      // trainerId puede venir como ObjectId o como objeto populate (según cómo lo uses)
      if (typeof socio.trainerId === "object" && socio.trainerId._id) return String(socio.trainerId._id);
      return String(socio.trainerId);
    }
    return null;
  };

  // =========================
  // 1) RESUMEN GENERAL
  // =========================
  let general = {
    year,
    month,
    totalSocios: payments.length,
    expectedTotal: 0,     // suma de cuotas (amount) de todos los registros
    paidCount: 0,         // cuantos están pagos
    collectedTotal: 0     // suma de cuotas pagas
  };

  for (const p of payments) {
    const amount = getShareAmount(p);
    general.expectedTotal += amount;

    if (p.isPaid) {
      general.paidCount += 1;
      general.collectedTotal += amount;
    }
  }

  // =========================
  // 2) RESUMEN POR ENTRENADOR
  // =========================
  // juntamos por trainerId
  const byTrainerMap = new Map<
    string,
    {
      trainerId: string;
      trainerName: string; // lo completamos después
      totalSocios: number; // cantidad de registros (uno por socio en ese mes)
      expectedTotal: number;
      paidCount: number;
      collectedTotal: number;
    }
  >();

  const trainerIdsSet = new Set<string>();

  for (const p of payments) {
    const trainerId = getTrainerId(p);
    if (!trainerId) continue;

    trainerIdsSet.add(trainerId);

    if (!byTrainerMap.has(trainerId)) {
      byTrainerMap.set(trainerId, {
        trainerId,
        trainerName: "", // luego
        totalSocios: 0,
        expectedTotal: 0,
        paidCount: 0,
        collectedTotal: 0
      });
    }

    const row = byTrainerMap.get(trainerId)!;
    const amount = getShareAmount(p);

    row.totalSocios += 1;
    row.expectedTotal += amount;

    if (p.isPaid) {
      row.paidCount += 1;
      row.collectedTotal += amount;
    }
  }

  // Traer nombres de entrenadores (users) en una sola consulta
  const trainerIds = Array.from(trainerIdsSet);
  const trainers = await UserModel.find({ _id: { $in: trainerIds } })
    .select("username dni")
    .lean();

  const trainerNameById = new Map<string, string>();
  for (const t of trainers) {
    trainerNameById.set(String(t._id), `${t.username} (DNI: ${t.dni})`);
  }

  // completar trainerName
  for (const [tid, row] of byTrainerMap.entries()) {
    row.trainerName = trainerNameById.get(tid) || tid; // fallback
  }

  // pasar a array y ordenar
  const byTrainer = Array.from(byTrainerMap.values()).sort((a, b) =>
    a.trainerName.localeCompare(b.trainerName)
  );

  return res.json({
    general,
    byTrainer
  });
};
