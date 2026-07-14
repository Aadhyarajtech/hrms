import { all, one, run, nowIso } from "@/db/connection";
import { toCamel } from "@/utils/case";
import { genId } from "@/utils/id";

export function listCycles() {
  return toCamel(all(`SELECT * FROM performance_cycles ORDER BY start_date DESC`));
}

export function createCycle(input: { name: string; startDate: string; endDate: string }) {
  const id = genId("cyc");
  run(`INSERT INTO performance_cycles (id, name, start_date, end_date, is_active) VALUES (:id, :name, :startDate, :endDate, 1)`, {
    id,
    ...input,
  });
  return toCamel(one(`SELECT * FROM performance_cycles WHERE id = :id`, { id }));
}

export function getActiveCycle() {
  const row = one(`SELECT * FROM performance_cycles WHERE is_active = 1 ORDER BY start_date DESC LIMIT 1`);
  return row ? toCamel(row) : undefined;
}

const REVIEW_SELECT = `
  SELECT pr.*, e.first_name as reviewee_first_name, e.last_name as reviewee_last_name, e.avatar_url as reviewee_avatar,
         des.title as reviewee_designation, d.name as reviewee_department,
         rv.first_name as reviewer_first_name, rv.last_name as reviewer_last_name,
         pc.name as cycle_name
  FROM performance_reviews pr
  JOIN employees e ON e.id = pr.reviewee_id
  JOIN designations des ON des.id = e.designation_id
  JOIN departments d ON d.id = e.department_id
  JOIN employees rv ON rv.id = pr.reviewer_id
  JOIN performance_cycles pc ON pc.id = pr.cycle_id
`;

export function listReviews(filters: { cycleId?: string; revieweeId?: string; reviewerId?: string }) {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};
  if (filters.cycleId) {
    conditions.push("pr.cycle_id = :cycleId");
    params.cycleId = filters.cycleId;
  }
  if (filters.revieweeId) {
    conditions.push("pr.reviewee_id = :revieweeId");
    params.revieweeId = filters.revieweeId;
  }
  if (filters.reviewerId) {
    conditions.push("pr.reviewer_id = :reviewerId");
    params.reviewerId = filters.reviewerId;
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return toCamel(all(`${REVIEW_SELECT} ${where} ORDER BY pr.submitted_at DESC`, params));
}

export function getReview(id: string) {
  const row = one(`${REVIEW_SELECT} WHERE pr.id = :id`, { id });
  return row ? toCamel(row) : undefined;
}

export function ensureReview(cycleId: string, revieweeId: string, reviewerId: string) {
  let row = one(`SELECT * FROM performance_reviews WHERE cycle_id = :cycleId AND reviewee_id = :revieweeId`, { cycleId, revieweeId });
  if (!row) {
    const id = genId("rev");
    run(
      `INSERT INTO performance_reviews (id, cycle_id, reviewee_id, reviewer_id, status) VALUES (:id, :cycleId, :revieweeId, :reviewerId, 'NOT_STARTED')`,
      { id, cycleId, revieweeId, reviewerId }
    );
    row = one(`SELECT * FROM performance_reviews WHERE id = :id`, { id });
  }
  return getReview((row as any).id);
}

export function submitSelfReview(id: string, selfRating: number, strengths: string, improvements: string) {
  run(
    `UPDATE performance_reviews SET self_rating = :selfRating, strengths = :strengths, improvements = :improvements, status = 'MANAGER_REVIEW' WHERE id = :id`,
    { id, selfRating, strengths, improvements }
  );
  return getReview(id);
}

export function submitManagerReview(id: string, managerRating: number, managerComments: string) {
  const review = getReview(id) as any;
  const finalRating = review?.selfRating ? Math.round(((review.selfRating + managerRating) / 2) * 10) / 10 : managerRating;
  run(
    `UPDATE performance_reviews SET manager_rating = :managerRating, manager_comments = :managerComments, final_rating = :finalRating, status = 'COMPLETED', submitted_at = :now WHERE id = :id`,
    { id, managerRating, managerComments, finalRating, now: nowIso() }
  );
  return getReview(id);
}

export function listGoals(employeeId: string) {
  return toCamel(all(`SELECT * FROM goals WHERE employee_id = :employeeId ORDER BY due_date ASC`, { employeeId }));
}

export function createGoal(input: { employeeId: string; title: string; description?: string; dueDate: string }) {
  const id = genId("goal");
  run(
    `INSERT INTO goals (id, employee_id, title, description, due_date, status, progress, created_at)
     VALUES (:id, :employeeId, :title, :description, :dueDate, 'NOT_STARTED', 0, :now)`,
    { id, employeeId: input.employeeId, title: input.title, description: input.description ?? null, dueDate: input.dueDate, now: nowIso() }
  );
  return toCamel(one(`SELECT * FROM goals WHERE id = :id`, { id }));
}

export function updateGoalProgress(id: string, progress: number) {
  const status = progress >= 100 ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "NOT_STARTED";
  run(`UPDATE goals SET progress = :progress, status = :status WHERE id = :id`, { id, progress, status });
  return toCamel(one(`SELECT * FROM goals WHERE id = :id`, { id }));
}

export function getAverageRatingByDepartment() {
  const rows = all(`
    SELECT d.name as department, ROUND(AVG(pr.final_rating), 2) as avg_rating
    FROM performance_reviews pr
    JOIN employees e ON e.id = pr.reviewee_id
    JOIN departments d ON d.id = e.department_id
    WHERE pr.final_rating IS NOT NULL
    GROUP BY d.id
  `);
  return toCamel(rows);
}
