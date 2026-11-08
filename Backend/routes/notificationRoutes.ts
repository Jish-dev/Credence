
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
  customerOrApprovedProvider,
  adminOnly,
} from "../middleware/authMiddle.js";

const router = Router();

router.use(protect);

// CUSTOMER + APPROVED PROVIDER
router.get("/", customerOrApprovedProvider, getMyNotifications);

router.get(
  "/unread-count",
  customerOrApprovedProvider,
  getUnreadCount
);

router.patch(
  "/read-all",
  customerOrApprovedProvider,
  markAllNotificationsAsRead
);

router.patch(
  "/:id/read",
  customerOrApprovedProvider,
  markNotificationAsRead
);

router.delete(
  "/:id",
  customerOrApprovedProvider,
  deleteNotification
);

// ADMIN
router.post("/admin/announcements", adminOnly, sendAnnouncement);

export default router;
