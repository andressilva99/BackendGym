import { Router } from "express";
import {
  getPayments,
  createPayment,
  generatePayments,
  togglePayment,
  updatePayment
} from "../controllers/payment.controller";

const router = Router();

router.get("/", getPayments);
router.post("/", createPayment);
router.post("/generate", generatePayments);
router.patch("/:id", updatePayment);
router.patch("/:id/toggle", togglePayment);

export default router;