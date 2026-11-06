
import { Router } from "express";

import {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  sendAnnouncement,
} from "../controllers/notificationControl.js";

import {
  protect,
  customerOnly,
  adminOnly,
} from "../middleware/authMiddle.js";

const router = Router();

router.use(protect);

// CUSTOMER ROUTES
router.get("/", customerOnly, getMyNotifications);

router.get("/unread-count", customerOnly, getUnreadCount);

router.patch("/read-all", customerOnly, markAllNotificationsAsRead);

router.patch("/:id/read", customerOnly, markNotificationAsRead);

router.delete("/:id", customerOnly, deleteNotification);

// ADMIN ROUTES
router.post("/admin/announcements", adminOnly, sendAnnouncement);

export default router;
