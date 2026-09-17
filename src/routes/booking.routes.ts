import { Router } from "express";
import {
  getBookings,
  createBooking,
  deleteBooking,
  getUnseenBookings,
  markAllBookingsSeen,
  markBookingSeen
} from "../controllers/booking.controller";

const router = Router();

router.get("/unseen", getUnseenBookings);
router.get("/", getBookings);
router.post("/", createBooking);
router.patch("/seen-all", markAllBookingsSeen);
router.patch("/:id/seen", markBookingSeen);
router.delete("/:id", deleteBooking);

export default router;
