import { Router } from "express";
import {
  getPrices,
  createPrice,
  updatePrice,
  deletePrice
} from "../controllers/price.controller";

const router = Router();

router.get("/", getPrices);
router.post("/", createPrice);
router.put("/:id", updatePrice);
router.delete("/:id", deletePrice);

export default router;
