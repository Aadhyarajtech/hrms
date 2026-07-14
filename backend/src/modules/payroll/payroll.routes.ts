import { Router } from "express";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { isAdmin, isAdminOrFinance } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { AppError } from "@/utils/errors";
import * as repo from "./payroll.repository";

export const payrollRouter = Router();
payrollRouter.use(authenticate);

payrollRouter.get("/salary-structure/:employeeId", isAdminOrFinance, (req, res) => {
  res.json({ structure: repo.getSalaryStructure(req.params.employeeId) ?? null });
});

const structureSchema = z.object({
  employeeId: z.string(),
  basic: z.number().min(0),
  hra: z.number().min(0),
  conveyance: z.number().min(0),
  medical: z.number().min(0),
  specialAllowance: z.number().min(0),
  pf: z.number().min(0),
  professionalTax: z.number().min(0),
  incomeTax: z.number().min(0),
});

payrollRouter.put("/salary-structure", isAdmin, validate(structureSchema), (req, res) => {
  res.json({ structure: repo.upsertSalaryStructure(req.body) });
});

payrollRouter.get("/runs", isAdminOrFinance, (_req, res) => {
  res.json({ runs: repo.listPayrollRuns() });
});

const processSchema = z.object({ month: z.number().int().min(1).max(12), year: z.number().int().min(2020) });
payrollRouter.post("/runs/process", isAdminOrFinance, validate(processSchema), (req, res, next) => {
  try {
    res.status(201).json({ run: repo.processPayrollRun(req.body.month, req.body.year) });
  } catch (err) {
    next(err);
  }
});

payrollRouter.post("/runs/:id/mark-paid", isAdminOrFinance, (req, res) => {
  res.json({ run: repo.markRunPaid(req.params.id) });
});

payrollRouter.get("/runs/:id/payslips", isAdminOrFinance, (req, res) => {
  res.json({ payslips: repo.listPayslipsForRun(req.params.id) });
});

payrollRouter.get("/payslips/mine", (req, res, next) => {
  try {
    if (!req.user!.employeeId) throw AppError.forbidden();
    res.json({ payslips: repo.listPayslipsForEmployee(req.user!.employeeId) });
  } catch (err) {
    next(err);
  }
});

payrollRouter.get("/payslips/employee/:employeeId", isAdminOrFinance, (req, res) => {
  res.json({ payslips: repo.listPayslipsForEmployee(req.params.employeeId) });
});

payrollRouter.get("/payslips/:id", (req, res, next) => {
  try {
    const payslip = repo.getPayslip(req.params.id) as any;
    if (!payslip) throw AppError.notFound("Payslip not found.");
    const isOwner = payslip.employeeId === req.user!.employeeId;
    const isPrivileged = ["SUPER_ADMIN", "HR_ADMIN", "FINANCE"].includes(req.user!.role);
    if (!isOwner && !isPrivileged) throw AppError.forbidden();
    res.json({ payslip });
  } catch (err) {
    next(err);
  }
});

payrollRouter.get("/analytics/cost-trend", isAdminOrFinance, (req, res) => {
  const months = req.query.months ? Number(req.query.months) : 6;
  res.json({ data: repo.getCostTrend(months) });
});
