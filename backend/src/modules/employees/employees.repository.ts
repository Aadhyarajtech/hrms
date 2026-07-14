import { db, all, one, run, nowIso } from "@/db/connection";
import { toCamel } from "@/utils/case";
import { genId } from "@/utils/id";
import bcrypt from "bcryptjs";

const EMPLOYEE_SELECT = `
  SELECT
    e.*,
    d.name as department_name, d.code as department_code, d.color_hex as department_color,
    des.title as designation_title, des.level as designation_level,
    m.first_name as manager_first_name, m.last_name as manager_last_name, m.id as manager_emp_id,
    u.email as email, u.role as role, u.is_active as is_active
  FROM employees e
  JOIN departments d ON d.id = e.department_id
  JOIN designations des ON des.id = e.designation_id
  LEFT JOIN employees m ON m.id = e.manager_id
  JOIN users u ON u.id = e.user_id
`;

export interface EmployeeFilters {
  search?: string;
  departmentId?: string;
  status?: string;
  managerId?: string;
  page?: number;
  pageSize?: number;
}

export function listEmployees(filters: EmployeeFilters) {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.search) {
    conditions.push(`(e.first_name LIKE :search OR e.last_name LIKE :search OR e.employee_code LIKE :search OR u.email LIKE :search)`);
    params.search = `%${filters.search}%`;
  }
  if (filters.departmentId) {
    conditions.push(`e.department_id = :departmentId`);
    params.departmentId = filters.departmentId;
  }
  if (filters.status) {
    conditions.push(`e.status = :status`);
    params.status = filters.status;
  }
  if (filters.managerId) {
    conditions.push(`e.manager_id = :managerId`);
    params.managerId = filters.managerId;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const rows = all(`${EMPLOYEE_SELECT} ${where} ORDER BY e.created_at DESC LIMIT :limit OFFSET :offset`, {
    ...params,
    limit: pageSize,
    offset,
  });

  const totalRow = one<{ count: number }>(
    `SELECT COUNT(*) as count FROM employees e JOIN users u ON u.id = e.user_id ${where}`,
    params
  );

  return {
    employees: toCamel(rows),
    total: totalRow?.count ?? 0,
    page,
    pageSize,
  };
}

export function getEmployeeById(id: string) {
  const row = one(`${EMPLOYEE_SELECT} WHERE e.id = :id`, { id });
  return row ? toCamel(row) : undefined;
}

export function getEmployeeByUserId(userId: string) {
  const row = one(`${EMPLOYEE_SELECT} WHERE e.user_id = :userId`, { userId });
  return row ? toCamel(row) : undefined;
}

export function listDirectReports(managerId: string) {
  const rows = all(`${EMPLOYEE_SELECT} WHERE e.manager_id = :managerId ORDER BY e.first_name`, { managerId });
  return toCamel(rows);
}

function nextEmployeeCode(): string {
  const year = new Date().getFullYear();
  const countRow = one<{ count: number }>(`SELECT COUNT(*) as count FROM employees`);
  const seq = (countRow?.count ?? 0) + 1;
  return `ART-${year}-${String(seq).padStart(4, "0")}`;
}

export interface CreateEmployeeInput {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  departmentId: string;
  designationId: string;
  managerId?: string | null;
  employmentType?: string;
  dateOfJoining: string;
  gender?: string;
  phone?: string;
  city?: string;
  personalEmail?: string;
  temporaryPassword: string;
}

export function createEmployee(input: CreateEmployeeInput) {
  const userId = genId("usr");
  const employeeId = genId("emp");
  const now = nowIso();
  const passwordHash = bcrypt.hashSync(input.temporaryPassword, 10);
  const employeeCode = nextEmployeeCode();

  db.exec("BEGIN");
  try {
    run(
      `INSERT INTO users (id, email, password_hash, role, is_active, must_reset_pwd, created_at, updated_at)
       VALUES (:id, :email, :passwordHash, :role, 1, 1, :now, :now)`,
      { id: userId, email: input.email.toLowerCase().trim(), passwordHash, role: input.role, now }
    );
    run(
      `INSERT INTO employees (
         id, employee_code, user_id, first_name, last_name, gender, phone, personal_email, city,
         department_id, designation_id, manager_id, employment_type, status, date_of_joining,
         created_at, updated_at
       ) VALUES (
         :id, :employeeCode, :userId, :firstName, :lastName, :gender, :phone, :personalEmail, :city,
         :departmentId, :designationId, :managerId, :employmentType, 'ACTIVE', :dateOfJoining,
         :now, :now
       )`,
      {
        id: employeeId,
        employeeCode,
        userId,
        firstName: input.firstName,
        lastName: input.lastName,
        gender: input.gender ?? null,
        phone: input.phone ?? null,
        personalEmail: input.personalEmail ?? null,
        city: input.city ?? null,
        departmentId: input.departmentId,
        designationId: input.designationId,
        managerId: input.managerId ?? null,
        employmentType: input.employmentType ?? "FULL_TIME",
        dateOfJoining: input.dateOfJoining,
        now,
      }
    );
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return getEmployeeById(employeeId);
}

export interface UpdateEmployeeInput {
  firstName?: string;
  lastName?: string;
  departmentId?: string;
  designationId?: string;
  managerId?: string | null;
  employmentType?: string;
  status?: string;
  phone?: string;
  personalEmail?: string;
  address?: string;
  city?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  avatarUrl?: string;
  dateOfExit?: string | null;
}

export function updateEmployee(id: string, input: UpdateEmployeeInput) {
  const current = getEmployeeById(id) as any;
  if (!current) return undefined;

  const merged = { ...current, ...input };
  run(
    `UPDATE employees SET
       first_name = :firstName, last_name = :lastName, department_id = :departmentId,
       designation_id = :designationId, manager_id = :managerId, employment_type = :employmentType,
       status = :status, phone = :phone, personal_email = :personalEmail, address = :address,
       city = :city, emergency_contact_name = :emergencyContactName,
       emergency_contact_phone = :emergencyContactPhone, avatar_url = :avatarUrl,
       date_of_exit = :dateOfExit, updated_at = :now
     WHERE id = :id`,
    {
      id,
      firstName: merged.firstName,
      lastName: merged.lastName,
      departmentId: merged.departmentId,
      designationId: merged.designationId,
      managerId: merged.managerId ?? null,
      employmentType: merged.employmentType,
      status: merged.status,
      phone: merged.phone ?? null,
      personalEmail: merged.personalEmail ?? null,
      address: merged.address ?? null,
      city: merged.city ?? null,
      emergencyContactName: merged.emergencyContactName ?? null,
      emergencyContactPhone: merged.emergencyContactPhone ?? null,
      avatarUrl: merged.avatarUrl ?? null,
      dateOfExit: merged.dateOfExit ?? null,
      now: nowIso(),
    }
  );
  return getEmployeeById(id);
}

export function getOrgChart() {
  const rows = all<any>(`
    SELECT e.id, e.first_name, e.last_name, e.avatar_url, e.manager_id, e.status,
           des.title as designation_title, d.name as department_name, d.color_hex as department_color
    FROM employees e
    JOIN designations des ON des.id = e.designation_id
    JOIN departments d ON d.id = e.department_id
    WHERE e.status != 'TERMINATED'
    ORDER BY des.level DESC
  `);

  const camel = toCamel<any[]>(rows);
  const byId = new Map(camel.map((e) => [e.id, { ...e, directReports: [] as any[] }]));
  const roots: any[] = [];

  for (const emp of byId.values()) {
    if (emp.managerId && byId.has(emp.managerId)) {
      byId.get(emp.managerId)!.directReports.push(emp);
    } else {
      roots.push(emp);
    }
  }
  return roots;
}

export function getHeadcountByDepartment() {
  const rows = all(`
    SELECT d.name as department, d.color_hex as color, COUNT(e.id) as count
    FROM departments d
    LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'ACTIVE'
    GROUP BY d.id
    ORDER BY count DESC
  `);
  return toCamel(rows);
}

export function getGenderDiversity() {
  const rows = all(`
    SELECT COALESCE(gender, 'Unspecified') as gender, COUNT(*) as count
    FROM employees WHERE status = 'ACTIVE' GROUP BY gender
  `);
  return toCamel(rows);
}

export function getEmploymentTypeBreakdown() {
  const rows = all(`
    SELECT employment_type as type, COUNT(*) as count
    FROM employees WHERE status = 'ACTIVE' GROUP BY employment_type
  `);
  return toCamel(rows);
}

export function getHeadcountTrend(months = 6) {
  // Approximates historical headcount using join-date cumulative counts per month.
  const rows = all<any>(`SELECT date_of_joining, date_of_exit FROM employees`);
  const trend: { month: string; headcount: number }[] = [];
  const today = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const cutoff = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const count = rows.filter((r: any) => {
      const joined = new Date(r.date_of_joining);
      const exited = r.date_of_exit ? new Date(r.date_of_exit) : null;
      return joined <= cutoff && (!exited || exited > cutoff);
    }).length;
    trend.push({ month: d.toLocaleString("en-IN", { month: "short", year: "2-digit" }), headcount: count });
  }
  return trend;
}

export function getManagersList() {
  const rows = all(`
    SELECT DISTINCT e.id, e.first_name, e.last_name, des.title as designation_title
    FROM employees e
    JOIN designations des ON des.id = e.designation_id
    WHERE des.level >= 4 AND e.status = 'ACTIVE'
    ORDER BY e.first_name
  `);
  return toCamel(rows);
}
