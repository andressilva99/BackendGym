import { Request, Response } from "express";
import { PaymentModel } from "../models/payment.model";
import { UserModel } from "../models/user.model"; // para traer username del trainer
import { BookingModel } from "../models/booking.model";
import { TimesLotModel, State } from "../models/timesLot.model";

/**
 * GET /reports/padel?year=2026&month=9
 * Reporte mensual de turnos de padel (por fecha del turno, no de la reserva):
 * - totals: reservas, ingresos, ticket promedio, turnos ofrecidos y % de ocupación
 * - byCourt: reservas e ingresos por cancha
 * - byRate: reservas e ingresos por tarifa (monto del turno)
 * - byDay: reservas e ingresos de cada día del mes (todos los días, aunque tengan 0)
 */
export const getPadelReport = async (req: Request, res: Response) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);

  if (!year || !month || month < 1 || month > 12) {
    return res.status(400).json({ message: "Faltan parámetros year y month válidos" });
  }

  // Las fechas de turnos se guardan como medianoche UTC del día → rango del mes en UTC
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));
  const dateFilter = { date: { $gte: from, $lt: to } };

  const [bookings, slotsTotal, slotsBooked] = await Promise.all([
    BookingModel.find(dateFilter).select("courtName paidAmount date").lean(),
    TimesLotModel.countDocuments(dateFilter),
    TimesLotModel.countDocuments({ ...dateFilter, status: State.BOOKED })
  ]);

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const byDay = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, bookings: 0, revenue: 0 }));
  const byCourtMap = new Map<string, { courtName: string; bookings: number; revenue: number }>();
  const byRateMap = new Map<number, { amount: number; bookings: number; revenue: number }>();

  let revenue = 0;
  for (const b of bookings) {
    const amount = Number(b.paidAmount) || 0;
    revenue += amount;

    const dayRow = byDay[new Date(b.date).getUTCDate() - 1];
    if (dayRow) {
      dayRow.bookings += 1;
      dayRow.revenue += amount;
    }

    const court = byCourtMap.get(b.courtName) ?? { courtName: b.courtName, bookings: 0, revenue: 0 };
    court.bookings += 1;
    court.revenue += amount;
    byCourtMap.set(b.courtName, court);

    const rate = byRateMap.get(amount) ?? { amount, bookings: 0, revenue: 0 };
    rate.bookings += 1;
    rate.revenue += amount;
    byRateMap.set(amount, rate);
  }

  res.json({
    year,
    month,
    totals: {
      bookings: bookings.length,
      revenue,
      averageTicket: bookings.length ? Math.round(revenue / bookings.length) : 0,
      slotsTotal,
      slotsBooked,
      occupancy: slotsTotal ? Math.round((slotsBooked / slotsTotal) * 100) : 0
    },
    byCourt: Array.from(byCourtMap.values()).sort((a, b) => b.revenue - a.revenue),
    byRate: Array.from(byRateMap.values()).sort((a, b) => a.amount - b.amount),
    byDay
  });
};

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
  // Primero el monto guardado en el pago ("foto" al generarlo); si es un pago viejo sin
  // foto, el de la cuota como antes
  const getShareAmount = (p: any) => {
    if (p.amount != null) return Number(p.amount) || 0;
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
