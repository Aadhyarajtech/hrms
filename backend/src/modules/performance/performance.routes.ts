import { Router } from "express";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { isAdmin, isManagerOrAbove } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { AppError } from "@/utils/errors";
import * as repo from "./performance.repository";

export const performanceRouter = Router();
performanceRouter.use(authenticate);

performanceRouter.get("/cycles", (_req, res) => {
  res.json({ cycles: repo.listCycles() });
});

const cycleSchema = z.object({ name: z.string().min(2), startDate: z.string(), endDate: z.string() });
performanceRouter.post("/cycles", isAdmin, validate(cycleSchema), (req, res) => {
  res.status(201).json({ cycle: repo.createCycle(req.body) });
});

performanceRouter.get("/reviews", (req, res) => {
  const { role, employeeId } = req.user!;
  const isPrivileged = ["SUPER_ADMIN", "HR_ADMIN"].includes(role);
  const filters: any = { cycleId: req.query.cycleId as string | undefined };

  if (req.query.scope === "team" && employeeId) filters.reviewerId = employeeId;
  else if (!isPrivileged) filters.revieweeId = employeeId;
  else if (req.query.revieweeId) filters.revieweeId = req.query.revieweeId;

  res.json({ reviews: repo.listReviews(filters) });
});

performanceRouter.get("/reviews/mine", (req, res, next) => {
  try {
    const cycle = repo.getActiveCycle();
    if (!cycle || !req.user!.employeeId) return res.json({ review: null });
    res.json({ review: repo.listReviews({ cycleId: (cycle as any).id, revieweeId: req.user!.employeeId })[0] ?? null });
  } catch (err) {
    next(err);
  }
});

const ensureSchema = z.object({ cycleId: z.string(), revieweeId: z.string(), reviewerId: z.string() });
performanceRouter.post("/reviews", isManagerOrAbove, validate(ensureSchema), (req, res) => {
  res.status(201).json({ review: repo.ensureReview(req.body.cycleId, req.body.revieweeId, req.body.reviewerId) });
});

const selfReviewSchema = z.object({
  selfRating: z.number().min(1).max(5),
  strengths: z.string().min(2),
  improvements: z.string().min(2),
});
performanceRouter.post("/reviews/:id/self", validate(selfReviewSchema), (req, res, next) => {
  try {
    const review = repo.getReview(req.params.id) as any;
    if (!review) throw AppError.notFound("Review not found.");
    if (review.revieweeId !== req.user!.employeeId) throw AppError.forbidden();
    res.json({ review: repo.submitSelfReview(req.params.id, req.body.selfRating, req.body.strengths, req.body.improvements) });
  } catch (err) {
    next(err);
  }
});

const managerReviewSchema = z.object({
  managerRating: z.number().min(1).max(5),
  managerComments: z.string().min(2),
});
performanceRouter.post("/reviews/:id/manager", isManagerOrAbove, validate(managerReviewSchema), (req, res, next) => {
  try {
    const review = repo.getReview(req.params.id);
    if (!review) throw AppError.notFound("Review not found.");
    res.json({ review: repo.submitManagerReview(req.params.id, req.body.managerRating, req.body.managerComments) });
  } catch (err) {
    next(err);
  }
});

performanceRouter.get("/goals", (req, res) => {
  const employeeId = (req.query.employeeId as string) || req.user!.employeeId!;
  res.json({ goals: repo.listGoals(employeeId) });
});

const goalSchema = z.object({ title: z.string().min(2), description: z.string().optional(), dueDate: z.string() });
performanceRouter.post("/goals", validate(goalSchema), (req, res, next) => {
  try {
    if (!req.user!.employeeId) throw AppError.forbidden();
    res.status(201).json({ goal: repo.createGoal({ employeeId: req.user!.employeeId, ...req.body }) });
  } catch (err) {
    next(err);
  }
});

const progressSchema = z.object({ progress: z.number().int().min(0).max(100) });
performanceRouter.patch("/goals/:id/progress", validate(progressSchema), (req, res) => {
  res.json({ goal: repo.updateGoalProgress(req.params.id, req.body.progress) });
});

performanceRouter.get("/analytics/rating-by-department", isManagerOrAbove, (_req, res) => {
  res.json({ data: repo.getAverageRatingByDepartment() });
});
