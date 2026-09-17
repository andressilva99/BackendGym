import { Router } from "express";
import {
  getCourts,
  createCourt,
  updateCourt,
  deleteCourt
} from "../controllers/court.controller";

const router = Router();

router.get("/", getCourts);
router.post("/", createCourt);
router.put("/:id", updateCourt);
router.delete("/:id", deleteCourt);

export default router;
