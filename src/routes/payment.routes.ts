import { Router } from "express";
import {
  getPayments,
  createPayment,
  generatePayments,
  togglePayment,
  updatePayment,
  deletePayment
} from "../controllers/payment.controller";

const router = Router();

router.get("/", getPayments);
router.post("/", createPayment);
router.post("/generate", generatePayments);
router.patch("/:id", updatePayment);
router.patch("/:id/toggle", togglePayment);
router.delete("/:id", deletePayment);

export default router;