import { Router } from "express";
import {
  getSocios,
  createSocio,
  updateSocio,
  deleteSocio
} from "../controllers/socio.controller";

const router = Router();

router.get("/", getSocios);
router.post("/", createSocio);
router.put("/:id", updateSocio);
router.delete("/:id", deleteSocio);

export default router;