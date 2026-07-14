import { all, one } from "@/db/connection";
import { toCamel } from "@/utils/case";

export function getKpis() {
  const headcount = one<{ count: number }>(`SELECT COUNT(*) as count FROM employees WHERE status = 'ACTIVE'`)?.count ?? 0;
  const newHires30d = one<{ count: number }>(
    `SELECT COUNT(*) as count FROM employees WHERE date_of_joining >= date('now', '-30 days')`
  )?.count ?? 0;
  const exits90d = one<{ count: number }>(
    `SELECT COUNT(*) as count FROM employees WHERE date_of_exit IS NOT NULL AND date_of_exit >= date('now', '-90 days')`
  )?.count ?? 0;
  const pendingLeave = one<{ count: number }>(`SELECT COUNT(*) as count FROM leave_requests WHERE status = 'PENDING'`)?.count ?? 0;
  const openRoles = one<{ count: number }>(`SELECT COUNT(*) as count FROM job_postings WHERE status = 'OPEN'`)?.count ?? 0;

  // Attendance is most meaningful on the most recent day people actually worked —
  // falls back gracefully on weekends/holidays instead of reporting a misleading zero.
  const attendanceDateRow = one<{ date: string }>(
    `SELECT date FROM attendance WHERE date <= date('now') ORDER BY date DESC LIMIT 1`
  );
  const attendanceDate = attendanceDateRow?.date ?? new Date().toISOString().slice(0, 10);

  const presentToday = one<{ count: number }>(
    `SELECT COUNT(*) as count FROM attendance WHERE date = :date AND status IN ('PRESENT','WORK_FROM_HOME','HALF_DAY')`,
    { date: attendanceDate }
  )?.count ?? 0;
  const onLeaveToday = one<{ count: number }>(
    `SELECT COUNT(*) as count FROM leave_requests WHERE status = 'APPROVED' AND start_date <= :date AND end_date >= :date`,
    { date: attendanceDate }
  )?.count ?? 0;

  const attritionRate = headcount > 0 ? Math.round((exits90d / (headcount + exits90d)) * 1000) / 10 : 0;
  const attendanceRate = headcount > 0 ? Math.round((presentToday / headcount) * 100) : 0;
  const isToday = attendanceDate === new Date().toISOString().slice(0, 10);

  return {
    headcount, newHires30d, exits90d, pendingLeave, openRoles, presentToday, onLeaveToday,
    attritionRate, attendanceRate, attendanceDate, attendanceIsToday: isToday,
  };
}

export function getUpcomingBirthdays() {
  const rows = all<any>(`
    SELECT id, first_name, last_name, avatar_url, date_of_birth,
           strftime('%m-%d', date_of_birth) as md
    FROM employees
    WHERE status = 'ACTIVE' AND date_of_birth IS NOT NULL
  `);
  const todayMd = new Date().toISOString().slice(5, 10);
  const upcoming = rows
    .map((r) => ({ ...r, diff: dayDiff(todayMd, r.md) }))
    .filter((r) => r.diff >= 0 && r.diff <= 30)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 6);
  return toCamel(upcoming);
}

export function getUpcomingAnniversaries() {
  const rows = all<any>(`
    SELECT id, first_name, last_name, avatar_url, date_of_joining,
           strftime('%m-%d', date_of_joining) as md,
           CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', date_of_joining) AS INTEGER) as years
    FROM employees
    WHERE status = 'ACTIVE'
  `);
  const todayMd = new Date().toISOString().slice(5, 10);
  const upcoming = rows
    .map((r) => ({ ...r, diff: dayDiff(todayMd, r.md) }))
    .filter((r) => r.diff >= 0 && r.diff <= 30 && r.years > 0)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 6);
  return toCamel(upcoming);
}

function dayDiff(todayMd: string, targetMd: string): number {
  const toDayOfYear = (md: string) => {
    const [m, d] = md.split("-").map(Number);
    return new Date(2001, m - 1, d).getTime();
  };
  const diffMs = toDayOfYear(targetMd) - toDayOfYear(todayMd);
  const days = Math.round(diffMs / 86_400_000);
  return days < 0 ? days + 365 : days;
}

export function getRecentActivity(limit = 8) {
  const rows = all<any>(`
    SELECT 'leave' as kind, lr.applied_at as at, e.first_name, e.last_name, lr.status as detail, lt.name as label
    FROM leave_requests lr JOIN employees e ON e.id = lr.employee_id JOIN leave_types lt ON lt.id = lr.leave_type_id
    UNION ALL
    SELECT 'hire' as kind, e.created_at as at, e.first_name, e.last_name, e.status as detail, des.title as label
    FROM employees e JOIN designations des ON des.id = e.designation_id
    UNION ALL
    SELECT 'candidate' as kind, c.applied_at as at, c.first_name, c.last_name, c.stage as detail, jp.title as label
    FROM candidates c JOIN job_postings jp ON jp.id = c.job_posting_id
    ORDER BY at DESC LIMIT :limit
  `, { limit });
  return toCamel(rows);
}

export function getUpcomingHolidays(limit = 4) {
  const rows = all(`SELECT * FROM holidays WHERE date >= date('now') ORDER BY date ASC LIMIT :limit`, { limit });
  return toCamel(rows);
}
