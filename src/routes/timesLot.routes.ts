import { Router } from "express";
import {
  getTimesLots,
  createTimesLot,
  updateTimesLot,
  deleteTimesLot
} from "../controllers/timesLot.controller";

const router = Router();

router.get("/", getTimesLots);
router.post("/", createTimesLot);
router.put("/:id", updateTimesLot);
router.delete("/:id", deleteTimesLot);

export default router;
