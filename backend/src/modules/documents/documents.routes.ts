import { Router } from "express";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { isAdmin } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { upload, UPLOADS_PUBLIC_PATH } from "@/middleware/upload";
import { AppError } from "@/utils/errors";
import * as repo from "./documents.repository";

export const documentsRouter = Router();
documentsRouter.use(authenticate);

documentsRouter.get("/employee/:employeeId", (req, res, next) => {
  try {
    const isOwner = req.params.employeeId === req.user!.employeeId;
    const isPrivileged = ["SUPER_ADMIN", "HR_ADMIN"].includes(req.user!.role);
    if (!isOwner && !isPrivileged) throw AppError.forbidden();
    res.json({ documents: repo.listDocuments(req.params.employeeId) });
  } catch (err) {
    next(err);
  }
});

documentsRouter.post("/employee/:employeeId", isAdmin, upload.single("file"), (req, res, next) => {
  try {
    if (!req.file) throw AppError.badRequest("Please attach a file.");
    const type = (req.body.type as string) || "OTHER";
    const document = repo.addDocument({
      employeeId: req.params.employeeId,
      type,
      fileName: req.file.originalname,
      fileUrl: `${UPLOADS_PUBLIC_PATH}/${req.file.filename}`,
    });
    res.status(201).json({ document });
  } catch (err) {
    next(err);
  }
});

documentsRouter.delete("/:id", isAdmin, (req, res) => {
  repo.deleteDocument(req.params.id);
  res.status(204).send();
});

// --- Assets ---
documentsRouter.get("/assets/all", isAdmin, (_req, res) => {
  res.json({ assets: repo.listAssets() });
});

documentsRouter.get("/assets/employee/:employeeId", (req, res, next) => {
  try {
    const isOwner = req.params.employeeId === req.user!.employeeId;
    const isPrivileged = ["SUPER_ADMIN", "HR_ADMIN"].includes(req.user!.role);
    if (!isOwner && !isPrivileged) throw AppError.forbidden();
    res.json({ assets: repo.listAssets(req.params.employeeId) });
  } catch (err) {
    next(err);
  }
});

const assignSchema = z.object({
  employeeId: z.string(),
  assetTag: z.string().min(1),
  category: z.string().min(1),
  name: z.string().min(1),
});
documentsRouter.post("/assets", isAdmin, validate(assignSchema), (req, res) => {
  res.status(201).json({ asset: repo.assignAsset(req.body) });
});

const assetStatusSchema = z.object({ status: z.enum(["ASSIGNED", "RETURNED", "DAMAGED", "LOST"]) });
documentsRouter.patch("/assets/:id/status", isAdmin, validate(assetStatusSchema), (req, res) => {
  res.json({ asset: repo.updateAssetStatus(req.params.id, req.body.status) });
});
