import { all, one, run, db, nowIso } from "@/db/connection";
import { toCamel } from "@/utils/case";
import { genId } from "@/utils/id";

export function getSalaryStructure(employeeId: string) {
  const row = one(`SELECT * FROM salary_structures WHERE employee_id = :employeeId`, { employeeId });
  return row ? toCamel(row) : undefined;
}

export interface SalaryStructureInput {
  employeeId: string;
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  pf: number;
  professionalTax: number;
  incomeTax: number;
}

export function upsertSalaryStructure(input: SalaryStructureInput) {
  const existing = getSalaryStructure(input.employeeId);
  if (existing) {
    run(
      `UPDATE salary_structures SET basic=:basic, hra=:hra, conveyance=:conveyance, medical=:medical,
         special_allowance=:specialAllowance, pf=:pf, professional_tax=:professionalTax, income_tax=:incomeTax,
         effective_from=:now WHERE employee_id=:employeeId`,
      { ...input, now: nowIso() }
    );
  } else {
    const id = genId("sal");
    run(
      `INSERT INTO salary_structures (id, employee_id, basic, hra, conveyance, medical, special_allowance, pf, professional_tax, income_tax, effective_from)
       VALUES (:id, :employeeId, :basic, :hra, :conveyance, :medical, :specialAllowance, :pf, :professionalTax, :incomeTax, :now)`,
      { id, ...input, now: nowIso() }
    );
  }
  return getSalaryStructure(input.employeeId);
}

export function listPayrollRuns() {
  return toCamel(all(`SELECT * FROM payroll_runs ORDER BY year DESC, month DESC`));
}

export function getPayrollRun(id: string) {
  const row = one(`SELECT * FROM payroll_runs WHERE id = :id`, { id });
  return row ? toCamel(row) : undefined;
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/** Processes payroll for every active employee with a salary structure. Idempotent per (month, year). */
export function processPayrollRun(month: number, year: number) {
  const existing = one(`SELECT * FROM payroll_runs WHERE month = :month AND year = :year`, { month, year });
  if (existing) return getPayrollRun((existing as any).id);

  const totalDays = daysInMonth(month, year);
  const employees = all<any>(`
    SELECT e.id as employee_id, s.* FROM employees e
    JOIN salary_structures s ON s.employee_id = e.id
    WHERE e.status IN ('ACTIVE', 'NOTICE_PERIOD')
  `);

  const runId = genId("prun");
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  db.exec("BEGIN");
  try {
    run(
      `INSERT INTO payroll_runs (id, month, year, status, total_gross, total_deductions, total_net, headcount)
       VALUES (:id, :month, :year, 'PROCESSED', 0, 0, 0, 0)`,
      { id: runId, month, year }
    );

    for (const emp of employees) {
      // Unpaid leave taken within this month reduces payable days.
      const pattern = `${year}-${String(month).padStart(2, "0")}`;
      const unpaidRow = one<{ total: number }>(
        `SELECT COALESCE(SUM(lr.total_days), 0) as total
         FROM leave_requests lr JOIN leave_types lt ON lt.id = lr.leave_type_id
         WHERE lr.employee_id = :employeeId AND lr.status = 'APPROVED' AND lt.is_paid = 0
           AND (lr.start_date LIKE :pattern OR lr.end_date LIKE :pattern)`,
        { employeeId: emp.employee_id, pattern: `${pattern}%` }
      );
      const unpaidDays = unpaidRow?.total ?? 0;
      const daysPayable = Math.max(totalDays - unpaidDays, 0);
      const perDayGross = (emp.basic + emp.hra + emp.conveyance + emp.medical + emp.special_allowance) / totalDays;
      const lop = Math.round(perDayGross * unpaidDays * 100) / 100;

      const grossEarnings = emp.basic + emp.hra + emp.conveyance + emp.medical + emp.special_allowance;
      const deductions = emp.pf + emp.professional_tax + emp.income_tax + lop;
      const netPay = Math.round((grossEarnings - deductions) * 100) / 100;

      const payslipId = genId("pay");
      run(
        `INSERT INTO payslips (id, payroll_run_id, employee_id, basic, hra, conveyance, medical, special_allowance,
           gross_earnings, pf, professional_tax, income_tax, lop, total_deductions, net_pay, days_payable, days_in_month)
         VALUES (:id, :runId, :employeeId, :basic, :hra, :conveyance, :medical, :specialAllowance,
           :grossEarnings, :pf, :professionalTax, :incomeTax, :lop, :totalDeductions, :netPay, :daysPayable, :daysInMonth)`,
        {
          id: payslipId,
          runId,
          employeeId: emp.employee_id,
          basic: emp.basic,
          hra: emp.hra,
          conveyance: emp.conveyance,
          medical: emp.medical,
          specialAllowance: emp.special_allowance,
          grossEarnings,
          pf: emp.pf,
          professionalTax: emp.professional_tax,
          incomeTax: emp.income_tax,
          lop,
          totalDeductions: deductions,
          netPay,
          daysPayable,
          daysInMonth: totalDays,
        }
      );

      totalGross += grossEarnings;
      totalDeductions += deductions;
      totalNet += netPay;
    }

    run(
      `UPDATE payroll_runs SET total_gross = :totalGross, total_deductions = :totalDeductions, total_net = :totalNet, headcount = :headcount, processed_at = :now WHERE id = :id`,
      { id: runId, totalGross, totalDeductions, totalNet, headcount: employees.length, now: nowIso() }
    );
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return getPayrollRun(runId);
}

export function markRunPaid(id: string) {
  run(`UPDATE payroll_runs SET status = 'PAID', processed_at = :now WHERE id = :id`, { id, now: nowIso() });
  return getPayrollRun(id);
}

export function listPayslipsForRun(runId: string) {
  const rows = all(
    `SELECT p.*, e.first_name, e.last_name, e.employee_code, d.name as department_name
     FROM payslips p JOIN employees e ON e.id = p.employee_id JOIN departments d ON d.id = e.department_id
     WHERE p.payroll_run_id = :runId ORDER BY e.first_name`,
    { runId }
  );
  return toCamel(rows);
}

export function listPayslipsForEmployee(employeeId: string) {
  const rows = all(
    `SELECT p.*, r.month, r.year, r.status as run_status
     FROM payslips p JOIN payroll_runs r ON r.id = p.payroll_run_id
     WHERE p.employee_id = :employeeId ORDER BY r.year DESC, r.month DESC`,
    { employeeId }
  );
  return toCamel(rows);
}

export function getPayslip(id: string) {
  const row = one(
    `SELECT p.*, r.month, r.year, r.status as run_status, e.first_name, e.last_name, e.employee_code,
            des.title as designation_title, d.name as department_name
     FROM payslips p
     JOIN payroll_runs r ON r.id = p.payroll_run_id
     JOIN employees e ON e.id = p.employee_id
     JOIN designations des ON des.id = e.designation_id
     JOIN departments d ON d.id = e.department_id
     WHERE p.id = :id`,
    { id }
  );
  return row ? toCamel(row) : undefined;
}

export function getCostTrend(months = 6) {
  const rows = all<any>(`SELECT month, year, total_net FROM payroll_runs ORDER BY year DESC, month DESC LIMIT :months`, { months });
  return toCamel(rows.reverse());
}
