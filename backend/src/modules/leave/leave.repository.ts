import { all, one, run, nowIso } from "@/db/connection";
import { toCamel } from "@/utils/case";
import { genId } from "@/utils/id";

export function listLeaveTypes() {
  return toCamel(all(`SELECT * FROM leave_types ORDER BY name ASC`));
}

export function getLeaveType(id: string) {
  const row = one(`SELECT * FROM leave_types WHERE id = :id`, { id });
  return row ? toCamel(row) : undefined;
}

export function getOrCreateBalance(employeeId: string, leaveTypeId: string, year: number) {
  let row = one(`SELECT * FROM leave_balances WHERE employee_id = :employeeId AND leave_type_id = :leaveTypeId AND year = :year`, {
    employeeId,
    leaveTypeId,
    year,
  });
  if (!row) {
    const leaveType = getLeaveType(leaveTypeId) as any;
    const id = genId("lbal");
    run(
      `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, allotted, used, carried_over)
       VALUES (:id, :employeeId, :leaveTypeId, :year, :allotted, 0, 0)`,
      { id, employeeId, leaveTypeId, year, allotted: leaveType?.defaultDaysPerYear ?? 12 }
    );
    row = one(`SELECT * FROM leave_balances WHERE id = :id`, { id });
  }
  return toCamel(row);
}

export function listBalancesForEmployee(employeeId: string, year: number) {
  const types = listLeaveTypes() as any[];
  return types.map((t) => getOrCreateBalance(employeeId, t.id, year));
}

export function listRequests(filters: { employeeId?: string; status?: string; approverId?: string }) {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};
  if (filters.employeeId) {
    conditions.push("lr.employee_id = :employeeId");
    params.employeeId = filters.employeeId;
  }
  if (filters.status) {
    conditions.push("lr.status = :status");
    params.status = filters.status;
  }
  if (filters.approverId) {
    conditions.push("e.manager_id = :approverId");
    params.approverId = filters.approverId;
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = all(
    `SELECT lr.*, lt.name as leave_type_name, lt.color_hex as leave_type_color,
            e.first_name, e.last_name, e.employee_code, e.avatar_url
     FROM leave_requests lr
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     JOIN employees e ON e.id = lr.employee_id
     ${where}
     ORDER BY lr.applied_at DESC`,
    params
  );
  return toCamel(rows);
}

function daysBetweenInclusive(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

export function createRequest(input: { employeeId: string; leaveTypeId: string; startDate: string; endDate: string; reason: string }) {
  const totalDays = daysBetweenInclusive(input.startDate, input.endDate);
  const id = genId("lreq");
  run(
    `INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, total_days, reason, status, applied_at)
     VALUES (:id, :employeeId, :leaveTypeId, :startDate, :endDate, :totalDays, :reason, 'PENDING', :now)`,
    { id, ...input, totalDays, now: nowIso() }
  );
  return toCamel(one(`SELECT * FROM leave_requests WHERE id = :id`, { id }));
}

export function getRequest(id: string) {
  const row = one(`SELECT * FROM leave_requests WHERE id = :id`, { id });
  return row ? toCamel(row) : undefined;
}

export function decideRequest(id: string, approverId: string, status: "APPROVED" | "REJECTED", decisionNote?: string) {
  const request = getRequest(id) as any;
  if (!request) return undefined;

  run(
    `UPDATE leave_requests SET status = :status, approver_id = :approverId, decision_note = :decisionNote, decided_at = :now WHERE id = :id`,
    { id, status, approverId, decisionNote: decisionNote ?? null, now: nowIso() }
  );

  if (status === "APPROVED") {
    const year = new Date(request.startDate).getFullYear();
    const balance = getOrCreateBalance(request.employeeId, request.leaveTypeId, year) as any;
    run(`UPDATE leave_balances SET used = used + :days WHERE id = :id`, { id: balance.id, days: request.totalDays });
  }

  return toCamel(one(`SELECT * FROM leave_requests WHERE id = :id`, { id }));
}

export function cancelRequest(id: string, employeeId: string) {
  run(`UPDATE leave_requests SET status = 'CANCELLED', decided_at = :now WHERE id = :id AND employee_id = :employeeId AND status = 'PENDING'`, {
    id,
    employeeId,
    now: nowIso(),
  });
  return getRequest(id);
}

export function getLeaveCalendar(month: number, year: number) {
  const pattern = `${year}-${String(month).padStart(2, "0")}`;
  const rows = all(
    `SELECT lr.id, lr.start_date, lr.end_date, lr.status, e.first_name, e.last_name, e.avatar_url, lt.name as leave_type_name, lt.color_hex as leave_type_color
     FROM leave_requests lr
     JOIN employees e ON e.id = lr.employee_id
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.status = 'APPROVED' AND (lr.start_date LIKE :pattern OR lr.end_date LIKE :pattern)`,
    { pattern: `${pattern}%` }
  );
  return toCamel(rows);
}

export function onLeaveToday() {
  const today = new Date().toISOString().slice(0, 10);
  const row = one<{ count: number }>(
    `SELECT COUNT(*) as count FROM leave_requests WHERE status = 'APPROVED' AND start_date <= :today AND end_date >= :today`,
    { today }
  );
  return row?.count ?? 0;
}
