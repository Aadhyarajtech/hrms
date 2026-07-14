import { all, one, run, nowIso } from "@/db/connection";
import { toCamel } from "@/utils/case";
import { genId } from "@/utils/id";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getTodayRecord(employeeId: string) {
  const row = one(`SELECT * FROM attendance WHERE employee_id = :employeeId AND date = :date`, {
    employeeId,
    date: todayDateString(),
  });
  return row ? toCamel(row) : undefined;
}

export function checkIn(employeeId: string) {
  const existing = getTodayRecord(employeeId);
  const now = nowIso();
  if (existing) return existing;

  const id = genId("att");
  run(
    `INSERT INTO attendance (id, employee_id, date, check_in, status, created_at)
     VALUES (:id, :employeeId, :date, :now, 'PRESENT', :now)`,
    { id, employeeId, date: todayDateString(), now }
  );
  return getTodayRecord(employeeId);
}

export function checkOut(employeeId: string) {
  const existing = getTodayRecord(employeeId) as any;
  if (!existing || !existing.checkIn) return undefined;
  const now = new Date();
  const checkInTime = new Date(existing.checkIn);
  const hours = Math.round(((now.getTime() - checkInTime.getTime()) / 3_600_000) * 100) / 100;

  run(`UPDATE attendance SET check_out = :now, work_hours = :hours WHERE id = :id`, {
    id: existing.id,
    now: now.toISOString(),
    hours,
  });
  return getTodayRecord(employeeId);
}

export function listForEmployee(employeeId: string, month?: number, year?: number) {
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();
  const pattern = `${y}-${String(m).padStart(2, "0")}-%`;
  const rows = all(`SELECT * FROM attendance WHERE employee_id = :employeeId AND date LIKE :pattern ORDER BY date ASC`, {
    employeeId,
    pattern,
  });
  return toCamel(rows);
}

export function listForDate(date: string) {
  const rows = all(
    `SELECT a.*, e.first_name, e.last_name, e.employee_code, d.name as department_name
     FROM attendance a
     JOIN employees e ON e.id = a.employee_id
     JOIN departments d ON d.id = e.department_id
     WHERE a.date = :date
     ORDER BY a.check_in ASC`,
    { date }
  );
  return toCamel(rows);
}

export function getTodaySummary() {
  const recentRow = one<{ date: string }>(`SELECT date FROM attendance WHERE date <= date('now') ORDER BY date DESC LIMIT 1`);
  const date = recentRow?.date ?? todayDateString();
  const row = one<{ present: number; total: number }>(
    `SELECT
      (SELECT COUNT(*) FROM attendance WHERE date = :date AND status IN ('PRESENT','WORK_FROM_HOME','HALF_DAY')) as present,
      (SELECT COUNT(*) FROM employees WHERE status = 'ACTIVE') as total`,
    { date }
  );
  return { ...(row ?? { present: 0, total: 0 }), date, isToday: date === todayDateString() };
}

export function requestRegularization(employeeId: string, date: string, note: string) {
  const existing = one(`SELECT * FROM attendance WHERE employee_id = :employeeId AND date = :date`, { employeeId, date });
  if (existing) {
    run(`UPDATE attendance SET is_regularized = 1, note = :note WHERE employee_id = :employeeId AND date = :date`, {
      employeeId,
      date,
      note,
    });
  } else {
    const id = genId("att");
    run(
      `INSERT INTO attendance (id, employee_id, date, status, is_regularized, note, created_at)
       VALUES (:id, :employeeId, :date, 'PRESENT', 1, :note, :now)`,
      { id, employeeId, date, note, now: nowIso() }
    );
  }
  return toCamel(one(`SELECT * FROM attendance WHERE employee_id = :employeeId AND date = :date`, { employeeId, date }));
}

export function getMonthlyAttendanceTrend(months = 6) {
  const rows = all<any>(`SELECT date, status FROM attendance`);
  const result: { month: string; presentRate: number }[] = [];
  const today = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthRows = rows.filter((r) => r.date.startsWith(monthKey));
    const presentCount = monthRows.filter((r) => ["PRESENT", "WORK_FROM_HOME", "HALF_DAY"].includes(r.status)).length;
    const rate = monthRows.length ? Math.round((presentCount / monthRows.length) * 100) : 0;
    result.push({ month: d.toLocaleString("en-IN", { month: "short" }), presentRate: rate });
  }
  return result;
}
