import { Router } from "express";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { isManagerOrAbove } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { AppError } from "@/utils/errors";
import * as repo from "./attendance.repository";

export const attendanceRouter = Router();
attendanceRouter.use(authenticate);

attendanceRouter.get("/today", (req, res) => {
  if (!req.user!.employeeId) return res.json({ record: null });
  res.json({ record: repo.getTodayRecord(req.user!.employeeId) ?? null });
});

attendanceRouter.post("/check-in", (req, res, next) => {
  try {
    if (!req.user!.employeeId) throw AppError.forbidden("Only employees can check in.");
    res.json({ record: repo.checkIn(req.user!.employeeId) });
  } catch (err) {
    next(err);
  }
});

attendanceRouter.post("/check-out", (req, res, next) => {
  try {
    if (!req.user!.employeeId) throw AppError.forbidden("Only employees can check out.");
    const record = repo.checkOut(req.user!.employeeId);
    if (!record) throw AppError.badRequest("You need to check in before you can check out.");
    res.json({ record });
  } catch (err) {
    next(err);
  }
});

attendanceRouter.get("/me", (req, res) => {
  const month = req.query.month ? Number(req.query.month) : undefined;
  const year = req.query.year ? Number(req.query.year) : undefined;
  res.json({ records: repo.listForEmployee(req.user!.employeeId!, month, year) });
});

attendanceRouter.get("/employee/:employeeId", isManagerOrAbove, (req, res) => {
  const month = req.query.month ? Number(req.query.month) : undefined;
  const year = req.query.year ? Number(req.query.year) : undefined;
  res.json({ records: repo.listForEmployee(req.params.employeeId, month, year) });
});

attendanceRouter.get("/by-date/:date", isManagerOrAbove, (req, res) => {
  res.json({ records: repo.listForDate(req.params.date) });
});

attendanceRouter.get("/summary/today", (_req, res) => {
  res.json(repo.getTodaySummary());
});

attendanceRouter.get("/analytics/trend", isManagerOrAbove, (req, res) => {
  const months = req.query.months ? Number(req.query.months) : 6;
  res.json({ data: repo.getMonthlyAttendanceTrend(months) });
});

const regularizationSchema = z.object({
  date: z.string(),
  note: z.string().min(3, "Please describe the reason for regularization."),
});

attendanceRouter.post("/regularize", validate(regularizationSchema), (req, res, next) => {
  try {
    if (!req.user!.employeeId) throw AppError.forbidden();
    const { date, note } = req.body as z.infer<typeof regularizationSchema>;
    res.json({ record: repo.requestRegularization(req.user!.employeeId, date, note) });
  } catch (err) {
    next(err);
  }
});
