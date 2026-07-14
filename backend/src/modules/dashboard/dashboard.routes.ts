import { Router } from "express";
import { authenticate } from "@/middleware/auth";
import * as repo from "./dashboard.repository";
import * as employeeRepo from "@/modules/employees/employees.repository";
import * as attendanceRepo from "@/modules/attendance/attendance.repository";
import * as recruitmentRepo from "@/modules/recruitment/recruitment.repository";
import * as payrollRepo from "@/modules/payroll/payroll.repository";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get("/overview", (_req, res) => {
  res.json({
    kpis: repo.getKpis(),
    headcountByDepartment: employeeRepo.getHeadcountByDepartment(),
    headcountTrend: employeeRepo.getHeadcountTrend(6),
    genderDiversity: employeeRepo.getGenderDiversity(),
    employmentType: employeeRepo.getEmploymentTypeBreakdown(),
    attendanceTrend: attendanceRepo.getMonthlyAttendanceTrend(6),
    recruitmentPipeline: recruitmentRepo.getPipelineSummary(),
    costTrend: payrollRepo.getCostTrend(6),
    upcomingBirthdays: repo.getUpcomingBirthdays(),
    upcomingAnniversaries: repo.getUpcomingAnniversaries(),
    upcomingHolidays: repo.getUpcomingHolidays(),
    recentActivity: repo.getRecentActivity(8),
  });
});
