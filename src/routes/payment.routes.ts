import { Router } from "express";
import { getPayments, generatePayments, togglePayment } from "../controllers/payment.controller";

const router = Router();

router.get("/", getPayments);
router.post("/generate", generatePayments);
router.patch("/:id/toggle", togglePayment);

export default router;
