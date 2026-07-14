import { Router } from "express";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { isAdmin } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import * as repo from "./notifications.repository";

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get("/", (req, res) => {
  const unreadOnly = req.query.unreadOnly === "true";
  res.json({
    notifications: repo.listNotifications(req.user!.userId, unreadOnly),
    unreadCount: repo.unreadCount(req.user!.userId),
  });
});

notificationsRouter.post("/:id/read", (req, res) => {
  repo.markRead(req.params.id, req.user!.userId);
  res.json({ message: "Marked as read." });
});

notificationsRouter.post("/read-all", (req, res) => {
  repo.markAllRead(req.user!.userId);
  res.json({ message: "All notifications marked as read." });
});

notificationsRouter.get("/announcements", (_req, res) => {
  res.json({ announcements: repo.listAnnouncements() });
});

const announcementSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(2),
  pinned: z.boolean().optional(),
  audience: z.string().optional(),
});

notificationsRouter.post("/announcements", isAdmin, validate(announcementSchema), (req, res) => {
  res.status(201).json({ announcement: repo.createAnnouncement(req.body) });
});
