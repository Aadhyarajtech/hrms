import { Router } from "express";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { isAdmin } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { AppError } from "@/utils/errors";
import * as repo from "./organization.repository";

export const organizationRouter = Router();
organizationRouter.use(authenticate);

organizationRouter.get("/departments", (_req, res) => {
  res.json({ departments: repo.listDepartments() });
});

const departmentSchema = z.object({
  name: z.string().min(2, "Department name is required."),
  code: z.string().min(2).max(10),
  description: z.string().optional(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

organizationRouter.post("/departments", isAdmin, validate(departmentSchema), (req, res, next) => {
  try {
    res.status(201).json({ department: repo.createDepartment(req.body) });
  } catch (err) {
    next(err);
  }
});

const updateDepartmentSchema = departmentSchema.partial().extend({ headId: z.string().nullable().optional() });

organizationRouter.patch("/departments/:id", isAdmin, validate(updateDepartmentSchema), (req, res, next) => {
  try {
    const dept = repo.updateDepartment(req.params.id, req.body);
    if (!dept) throw AppError.notFound("Department not found.");
    res.json({ department: dept });
  } catch (err) {
    next(err);
  }
});

organizationRouter.get("/designations", (req, res) => {
  res.json({ designations: repo.listDesignations(req.query.departmentId as string | undefined) });
});

const designationSchema = z.object({
  title: z.string().min(2),
  level: z.number().int().min(1).max(10),
  departmentId: z.string(),
});

organizationRouter.post("/designations", isAdmin, validate(designationSchema), (req, res, next) => {
  try {
    res.status(201).json({ designation: repo.createDesignation(req.body) });
  } catch (err) {
    next(err);
  }
});

organizationRouter.get("/holidays", (req, res) => {
  const year = req.query.year ? Number(req.query.year) : undefined;
  res.json({ holidays: repo.listHolidays(year) });
});

const holidaySchema = z.object({
  name: z.string().min(2),
  date: z.string(), // YYYY-MM-DD
  isOptional: z.boolean().optional(),
});

organizationRouter.post("/holidays", isAdmin, validate(holidaySchema), (req, res, next) => {
  try {
    res.status(201).json({ holiday: repo.createHoliday(req.body) });
  } catch (err) {
    next(err);
  }
});

organizationRouter.delete("/holidays/:id", isAdmin, (req, res) => {
  repo.deleteHoliday(req.params.id);
  res.status(204).send();
});
