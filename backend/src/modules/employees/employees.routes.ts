import { Router } from "express";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { isAdmin, isManagerOrAbove } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { AppError } from "@/utils/errors";
import * as repo from "./employees.repository";
import { notify } from "@/modules/notifications/notifications.repository";

export const employeesRouter = Router();
employeesRouter.use(authenticate);

const listQuerySchema = z.object({
  search: z.string().optional(),
  departmentId: z.string().optional(),
  status: z.string().optional(),
  managerId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

employeesRouter.get("/", validate(listQuerySchema, "query"), (req, res) => {
  res.json(repo.listEmployees(req.query as any));
});

employeesRouter.get("/managers", (_req, res) => {
  res.json({ managers: repo.getManagersList() });
});

employeesRouter.get("/org-chart", (_req, res) => {
  res.json({ chart: repo.getOrgChart() });
});

employeesRouter.get("/analytics/headcount-by-department", isManagerOrAbove, (_req, res) => {
  res.json({ data: repo.getHeadcountByDepartment() });
});

employeesRouter.get("/analytics/gender-diversity", isManagerOrAbove, (_req, res) => {
  res.json({ data: repo.getGenderDiversity() });
});

employeesRouter.get("/analytics/employment-type", isManagerOrAbove, (_req, res) => {
  res.json({ data: repo.getEmploymentTypeBreakdown() });
});

employeesRouter.get("/analytics/headcount-trend", isManagerOrAbove, (req, res) => {
  const months = req.query.months ? Number(req.query.months) : 6;
  res.json({ data: repo.getHeadcountTrend(months) });
});

employeesRouter.get("/:id", (req, res, next) => {
  try {
    const employee = repo.getEmployeeById(req.params.id);
    if (!employee) throw AppError.notFound("Employee not found.");
    res.json({ employee });
  } catch (err) {
    next(err);
  }
});

employeesRouter.get("/:id/direct-reports", (req, res) => {
  res.json({ employees: repo.listDirectReports(req.params.id) });
});

const createEmployeeSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  role: z.enum(["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "RECRUITER", "FINANCE", "EMPLOYEE"]).default("EMPLOYEE"),
  departmentId: z.string(),
  designationId: z.string(),
  managerId: z.string().nullable().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).optional(),
  dateOfJoining: z.string(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  personalEmail: z.string().email().optional(),
  temporaryPassword: z.string().min(8, "Temporary password must be at least 8 characters."),
});

employeesRouter.post("/", isAdmin, validate(createEmployeeSchema), (req, res, next) => {
  try {
    const employee = repo.createEmployee(req.body);
    res.status(201).json({ employee });
  } catch (err) {
    next(err);
  }
});

const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  managerId: z.string().nullable().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "NOTICE_PERIOD", "TERMINATED", "RESIGNED"]).optional(),
  phone: z.string().optional(),
  personalEmail: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  avatarUrl: z.string().optional(),
  dateOfExit: z.string().nullable().optional(),
});

employeesRouter.patch("/:id", validate(updateEmployeeSchema), (req, res, next) => {
  try {
    const requester = req.user!;
    const target = repo.getEmployeeById(req.params.id) as any;
    if (!target) throw AppError.notFound("Employee not found.");

    const isSelf = requester.employeeId === req.params.id;
    const isPrivileged = ["SUPER_ADMIN", "HR_ADMIN"].includes(requester.role);
    if (!isSelf && !isPrivileged) throw AppError.forbidden();

    // Employees may only edit their own contact details, not org-structural fields.
    const body = isPrivileged
      ? req.body
      : {
          phone: req.body.phone,
          personalEmail: req.body.personalEmail,
          address: req.body.address,
          city: req.body.city,
          emergencyContactName: req.body.emergencyContactName,
          emergencyContactPhone: req.body.emergencyContactPhone,
          avatarUrl: req.body.avatarUrl,
        };

    const employee = repo.updateEmployee(req.params.id, body);

    if (isPrivileged && req.body.status && req.body.status !== target.status) {
      notify({
        userId: target.userId,
        type: "SYSTEM",
        title: "Your employment status was updated",
        message: `Your status is now "${req.body.status.replace("_", " ")}".`,
      });
    }

    res.json({ employee });
  } catch (err) {
    next(err);
  }
});
