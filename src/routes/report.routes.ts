import { Router } from "express";
import { getSummaryReport } from "../controllers/report.controller";

const router = Router();

router.get("/summary", getSummaryReport);

export default router;
