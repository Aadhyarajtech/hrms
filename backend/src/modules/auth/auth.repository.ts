import { one, run, nowIso } from "@/db/connection";
import { toCamel } from "@/utils/case";

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  role: "SUPER_ADMIN" | "HR_ADMIN" | "MANAGER" | "RECRUITER" | "FINANCE" | "EMPLOYEE";
  isActive: number;
  mustResetPwd: number;
  lastLoginAt: string | null;
}

export interface AuthProfileRow extends UserRow {
  employeeId: string | null;
  employeeCode: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  departmentId: string | null;
  departmentName: string | null;
  designationTitle: string | null;
}

export function findUserByEmail(email: string): UserRow | undefined {
  const row = one(`SELECT * FROM users WHERE email = :email`, { email });
  return row ? toCamel<UserRow>(row) : undefined;
}

export function findAuthProfile(userId: string): AuthProfileRow | undefined {
  const row = one(
    `SELECT
       u.id, u.email, u.role, u.is_active, u.must_reset_pwd, u.last_login_at,
       e.id as employee_id, e.employee_code, e.first_name, e.last_name, e.avatar_url,
       d.id as department_id, d.name as department_name, des.title as designation_title
     FROM users u
     LEFT JOIN employees e ON e.user_id = u.id
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN designations des ON des.id = e.designation_id
     WHERE u.id = :userId`,
    { userId }
  );
  return row ? toCamel<AuthProfileRow>(row) : undefined;
}

export function touchLastLogin(userId: string) {
  run(`UPDATE users SET last_login_at = :now WHERE id = :userId`, { now: nowIso(), userId });
}

export function updatePassword(userId: string, passwordHash: string) {
  run(
    `UPDATE users SET password_hash = :passwordHash, must_reset_pwd = 0, updated_at = :now WHERE id = :userId`,
    { passwordHash, now: nowIso(), userId }
  );
}
