import { Router } from "express";
import {
  getShares,
  createShare,
  updateShare,
  deleteShare
} from "../controllers/share.controller";

const router = Router();

router.get("/", getShares);
router.post("/", createShare);
router.put("/:id", updateShare);
router.delete("/:id", deleteShare);

export default router;
