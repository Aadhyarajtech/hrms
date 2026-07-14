import { Router } from "express";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { isAdminOrRecruiter } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { AppError } from "@/utils/errors";
import * as repo from "./recruitment.repository";

export const recruitmentRouter = Router();
recruitmentRouter.use(authenticate);

recruitmentRouter.get("/jobs", (req, res) => {
  res.json({ jobs: repo.listJobPostings(req.query.status as string | undefined) });
});

recruitmentRouter.get("/jobs/:id", (req, res, next) => {
  try {
    const job = repo.getJobPosting(req.params.id);
    if (!job) throw AppError.notFound("Job posting not found.");
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

const jobSchema = z.object({
  title: z.string().min(2),
  departmentId: z.string(),
  designationId: z.string(),
  location: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).optional(),
  experienceMin: z.number().int().min(0).optional(),
  experienceMax: z.number().int().min(0).optional(),
  description: z.string().min(10, "Add a fuller job description."),
  openings: z.number().int().min(1).optional(),
});

recruitmentRouter.post("/jobs", isAdminOrRecruiter, validate(jobSchema), (req, res) => {
  res.status(201).json({ job: repo.createJobPosting(req.body) });
});

const statusSchema = z.object({ status: z.enum(["OPEN", "ON_HOLD", "CLOSED"]) });
recruitmentRouter.patch("/jobs/:id/status", isAdminOrRecruiter, validate(statusSchema), (req, res) => {
  res.json({ job: repo.updateJobStatus(req.params.id, req.body.status) });
});

recruitmentRouter.get("/candidates", (req, res) => {
  res.json({ candidates: repo.listCandidates(req.query.jobPostingId as string | undefined) });
});

recruitmentRouter.get("/candidates/:id", (req, res, next) => {
  try {
    const candidate = repo.getCandidate(req.params.id);
    if (!candidate) throw AppError.notFound("Candidate not found.");
    res.json({ candidate });
  } catch (err) {
    next(err);
  }
});

const candidateSchema = z.object({
  jobPostingId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  expectedCtc: z.number().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

recruitmentRouter.post("/candidates", isAdminOrRecruiter, validate(candidateSchema), (req, res) => {
  res.status(201).json({ candidate: repo.createCandidate(req.body) });
});

const stageSchema = z.object({ stage: z.enum(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]) });
recruitmentRouter.patch("/candidates/:id/stage", isAdminOrRecruiter, validate(stageSchema), (req, res) => {
  res.json({ candidate: repo.moveCandidateStage(req.params.id, req.body.stage) });
});

const ratingSchema = z.object({ rating: z.number().int().min(1).max(5) });
recruitmentRouter.patch("/candidates/:id/rating", isAdminOrRecruiter, validate(ratingSchema), (req, res) => {
  res.json({ candidate: repo.rateCandidate(req.params.id, req.body.rating) });
});

recruitmentRouter.get("/interviews", (req, res) => {
  res.json({ interviews: repo.listInterviews(req.query.candidateId as string | undefined) });
});

const scheduleSchema = z.object({
  candidateId: z.string(),
  interviewerId: z.string(),
  scheduledAt: z.string(),
  round: z.string().optional(),
});
recruitmentRouter.post("/interviews", isAdminOrRecruiter, validate(scheduleSchema), (req, res) => {
  res.status(201).json({ interview: repo.scheduleInterview(req.body) });
});

const feedbackSchema = z.object({
  feedback: z.string().min(2),
  recommendation: z.enum(["STRONG_YES", "YES", "NO", "STRONG_NO"]),
});
recruitmentRouter.post("/interviews/:id/feedback", isAdminOrRecruiter, validate(feedbackSchema), (req, res) => {
  res.json({ interview: repo.submitInterviewFeedback(req.params.id, req.body.feedback, req.body.recommendation) });
});

recruitmentRouter.get("/analytics/pipeline", (_req, res) => {
  res.json({ data: repo.getPipelineSummary() });
});

recruitmentRouter.get("/analytics/open-roles", (_req, res) => {
  res.json({ count: repo.getOpenRolesCount() });
});
