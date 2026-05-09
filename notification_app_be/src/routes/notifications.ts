import { Router } from "express";
import {
  getAllNotifications,
  getPriorityNotifications,
} from "../controllers/notificationController";

const router = Router();

router.get("/priority", getPriorityNotifications);
router.get("/", getAllNotifications);

export default router;
