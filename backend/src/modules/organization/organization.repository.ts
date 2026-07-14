import { all, one, run, nowIso } from "@/db/connection";
import { toCamel } from "@/utils/case";
import { genId } from "@/utils/id";

export function listDepartments() {
  const rows = all(`
    SELECT d.*, 
      (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.status = 'ACTIVE') as headcount,
      h.first_name as head_first_name, h.last_name as head_last_name
    FROM departments d
    LEFT JOIN employees h ON h.id = d.head_id
    ORDER BY d.name ASC
  `);
  return toCamel(rows);
}

export function getDepartment(id: string) {
  const row = one(`SELECT * FROM departments WHERE id = :id`, { id });
  return row ? toCamel(row) : undefined;
}

export function createDepartment(input: { name: string; code: string; description?: string; colorHex?: string }) {
  const id = genId("dept");
  run(
    `INSERT INTO departments (id, name, code, description, color_hex, created_at)
     VALUES (:id, :name, :code, :description, :colorHex, :now)`,
    {
      id,
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description ?? null,
      colorHex: input.colorHex ?? "#5B4FE5",
      now: nowIso(),
    }
  );
  return getDepartment(id);
}

export function updateDepartment(
  id: string,
  input: { name?: string; description?: string; colorHex?: string; headId?: string | null }
) {
  const current = getDepartment(id);
  if (!current) return undefined;
  run(
    `UPDATE departments SET
       name = :name, description = :description, color_hex = :colorHex, head_id = :headId
     WHERE id = :id`,
    {
      id,
      name: input.name ?? (current as any).name,
      description: input.description ?? (current as any).description,
      colorHex: input.colorHex ?? (current as any).colorHex,
      headId: input.headId === undefined ? (current as any).headId : input.headId,
    }
  );
  return getDepartment(id);
}

export function listDesignations(departmentId?: string) {
  const rows = departmentId
    ? all(`SELECT * FROM designations WHERE department_id = :departmentId ORDER BY level DESC, title ASC`, { departmentId })
    : all(`SELECT des.*, d.name as department_name FROM designations des JOIN departments d ON d.id = des.department_id ORDER BY d.name, des.level DESC`);
  return toCamel(rows);
}

export function createDesignation(input: { title: string; level: number; departmentId: string }) {
  const id = genId("desg");
  run(
    `INSERT INTO designations (id, title, level, department_id) VALUES (:id, :title, :level, :departmentId)`,
    { id, title: input.title, level: input.level, departmentId: input.departmentId }
  );
  return toCamel(one(`SELECT * FROM designations WHERE id = :id`, { id }));
}

export function listHolidays(year?: number) {
  const rows = year
    ? all(`SELECT * FROM holidays WHERE date LIKE :pattern ORDER BY date ASC`, { pattern: `${year}-%` })
    : all(`SELECT * FROM holidays ORDER BY date ASC`);
  return toCamel(rows);
}

export function createHoliday(input: { name: string; date: string; isOptional?: boolean }) {
  const id = genId("hol");
  run(`INSERT INTO holidays (id, name, date, is_optional) VALUES (:id, :name, :date, :isOptional)`, {
    id,
    name: input.name,
    date: input.date,
    isOptional: input.isOptional ? 1 : 0,
  });
  return toCamel(one(`SELECT * FROM holidays WHERE id = :id`, { id }));
}

export function deleteHoliday(id: string) {
  run(`DELETE FROM holidays WHERE id = :id`, { id });
}
