import { Router } from "express";
import { getPadelReport, getSummaryReport } from "../controllers/report.controller";

const router = Router();

router.get("/summary", getSummaryReport);
router.get("/padel", getPadelReport);

export default router;
