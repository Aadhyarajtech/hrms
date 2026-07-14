-- ============================================================================
-- Aadhyaraj HRMS — SQLite schema
-- Designed to be portable: every concept here maps 1:1 to a normalized
-- relational model that would translate cleanly to Postgres/MySQL in a
-- larger deployment (see README "Scaling beyond SQLite").
-- ============================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN','HR_ADMIN','MANAGER','RECRUITER','FINANCE','EMPLOYEE')) DEFAULT 'EMPLOYEE',
  is_active       INTEGER NOT NULL DEFAULT 1,
  must_reset_pwd  INTEGER NOT NULL DEFAULT 0,
  last_login_at   TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  code        TEXT NOT NULL UNIQUE,
  description TEXT,
  color_hex   TEXT NOT NULL DEFAULT '#5B4FE5',
  head_id     TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS designations (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  level         INTEGER NOT NULL DEFAULT 1,
  department_id TEXT NOT NULL REFERENCES departments(id),
  UNIQUE(title, department_id)
);

CREATE TABLE IF NOT EXISTS employees (
  id                      TEXT PRIMARY KEY,
  employee_code           TEXT NOT NULL UNIQUE,
  user_id                 TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  first_name              TEXT NOT NULL,
  last_name               TEXT NOT NULL,
  avatar_url              TEXT,
  gender                  TEXT,
  date_of_birth           TEXT,
  personal_email          TEXT,
  phone                   TEXT,
  address                 TEXT,
  city                    TEXT,
  country                 TEXT NOT NULL DEFAULT 'India',
  department_id           TEXT NOT NULL REFERENCES departments(id),
  designation_id          TEXT NOT NULL REFERENCES designations(id),
  manager_id              TEXT REFERENCES employees(id),
  employment_type         TEXT NOT NULL CHECK (employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','INTERN')) DEFAULT 'FULL_TIME',
  status                  TEXT NOT NULL CHECK (status IN ('ACTIVE','ON_LEAVE','NOTICE_PERIOD','TERMINATED','RESIGNED')) DEFAULT 'ACTIVE',
  date_of_joining         TEXT NOT NULL,
  date_of_exit            TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);

CREATE TABLE IF NOT EXISTS attendance (
  id              TEXT PRIMARY KEY,
  employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,
  check_in        TEXT,
  check_out       TEXT,
  status          TEXT NOT NULL CHECK (status IN ('PRESENT','ABSENT','HALF_DAY','WORK_FROM_HOME','ON_LEAVE','HOLIDAY','WEEKEND')) DEFAULT 'PRESENT',
  work_hours      REAL,
  is_regularized  INTEGER NOT NULL DEFAULT 0,
  note            TEXT,
  created_at      TEXT NOT NULL,
  UNIQUE(employee_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

CREATE TABLE IF NOT EXISTS holidays (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  date        TEXT NOT NULL UNIQUE,
  is_optional INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leave_types (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL UNIQUE,
  color_hex              TEXT NOT NULL DEFAULT '#5B4FE5',
  default_days_per_year  REAL NOT NULL DEFAULT 12,
  is_paid                INTEGER NOT NULL DEFAULT 1,
  requires_approval      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id            TEXT PRIMARY KEY,
  employee_id   TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id),
  year          INTEGER NOT NULL,
  allotted      REAL NOT NULL,
  used          REAL NOT NULL DEFAULT 0,
  carried_over  REAL NOT NULL DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id            TEXT PRIMARY KEY,
  employee_id   TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id),
  start_date    TEXT NOT NULL,
  end_date      TEXT NOT NULL,
  total_days    REAL NOT NULL,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')) DEFAULT 'PENDING',
  approver_id   TEXT REFERENCES employees(id),
  decision_note TEXT,
  applied_at    TEXT NOT NULL,
  decided_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

CREATE TABLE IF NOT EXISTS job_postings (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  department_id   TEXT NOT NULL REFERENCES departments(id),
  designation_id  TEXT NOT NULL REFERENCES designations(id),
  location        TEXT NOT NULL DEFAULT 'Bengaluru, India',
  employment_type TEXT NOT NULL CHECK (employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','INTERN')) DEFAULT 'FULL_TIME',
  experience_min  INTEGER NOT NULL DEFAULT 0,
  experience_max  INTEGER NOT NULL DEFAULT 5,
  description     TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('OPEN','ON_HOLD','CLOSED')) DEFAULT 'OPEN',
  openings        INTEGER NOT NULL DEFAULT 1,
  posted_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS candidates (
  id              TEXT PRIMARY KEY,
  job_posting_id  TEXT NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  resume_url      TEXT,
  stage           TEXT NOT NULL CHECK (stage IN ('APPLIED','SCREENING','INTERVIEW','OFFER','HIRED','REJECTED')) DEFAULT 'APPLIED',
  rating          INTEGER,
  expected_ctc    REAL,
  source          TEXT NOT NULL DEFAULT 'Career Site',
  referred_by_id  TEXT REFERENCES employees(id),
  applied_at      TEXT NOT NULL,
  notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates(stage);

CREATE TABLE IF NOT EXISTS interviews (
  id              TEXT PRIMARY KEY,
  candidate_id    TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  interviewer_id  TEXT NOT NULL REFERENCES employees(id),
  scheduled_at    TEXT NOT NULL,
  round           TEXT NOT NULL DEFAULT 'Round 1',
  feedback        TEXT,
  recommendation  TEXT,
  completed       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS performance_cycles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id              TEXT PRIMARY KEY,
  cycle_id        TEXT NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
  reviewee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id     TEXT NOT NULL REFERENCES employees(id),
  status          TEXT NOT NULL CHECK (status IN ('NOT_STARTED','SELF_REVIEW','MANAGER_REVIEW','COMPLETED')) DEFAULT 'NOT_STARTED',
  self_rating     REAL,
  manager_rating  REAL,
  final_rating    REAL,
  strengths       TEXT,
  improvements    TEXT,
  manager_comments TEXT,
  submitted_at    TEXT,
  UNIQUE(cycle_id, reviewee_id)
);

CREATE TABLE IF NOT EXISTS goals (
  id          TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  progress    INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL CHECK (status IN ('NOT_STARTED','IN_PROGRESS','AT_RISK','COMPLETED')) DEFAULT 'NOT_STARTED',
  due_date    TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS salary_structures (
  id                TEXT PRIMARY KEY,
  employee_id       TEXT NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  basic             REAL NOT NULL,
  hra               REAL NOT NULL,
  conveyance        REAL NOT NULL,
  medical           REAL NOT NULL,
  special_allowance REAL NOT NULL,
  pf                REAL NOT NULL,
  professional_tax  REAL NOT NULL,
  income_tax        REAL NOT NULL,
  effective_from    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id                TEXT PRIMARY KEY,
  month             INTEGER NOT NULL,
  year              INTEGER NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('DRAFT','PROCESSED','PAID')) DEFAULT 'DRAFT',
  processed_at      TEXT,
  total_gross       REAL NOT NULL DEFAULT 0,
  total_deductions  REAL NOT NULL DEFAULT 0,
  total_net         REAL NOT NULL DEFAULT 0,
  headcount         INTEGER NOT NULL DEFAULT 0,
  UNIQUE(month, year)
);

CREATE TABLE IF NOT EXISTS payslips (
  id                TEXT PRIMARY KEY,
  payroll_run_id    TEXT NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id       TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  basic             REAL NOT NULL,
  hra               REAL NOT NULL,
  conveyance        REAL NOT NULL,
  medical           REAL NOT NULL,
  special_allowance REAL NOT NULL,
  gross_earnings    REAL NOT NULL,
  pf                REAL NOT NULL,
  professional_tax  REAL NOT NULL,
  income_tax        REAL NOT NULL,
  lop               REAL NOT NULL DEFAULT 0,
  total_deductions  REAL NOT NULL,
  net_pay           REAL NOT NULL,
  days_payable      REAL NOT NULL,
  days_in_month     INTEGER NOT NULL,
  UNIQUE(payroll_run_id, employee_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  pinned      INTEGER NOT NULL DEFAULT 0,
  audience    TEXT NOT NULL DEFAULT 'ALL',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('LEAVE_REQUEST','LEAVE_DECISION','ANNOUNCEMENT','PAYROLL','PERFORMANCE','RECRUITMENT','SYSTEM')) DEFAULT 'SYSTEM',
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     INTEGER NOT NULL DEFAULT 0,
  link        TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('OFFER_LETTER','ID_PROOF','ADDRESS_PROOF','EDUCATIONAL','CONTRACT','OTHER')) DEFAULT 'OTHER',
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  uploaded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id          TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  asset_tag   TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL,
  name        TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  returned_at TEXT,
  status      TEXT NOT NULL CHECK (status IN ('ASSIGNED','RETURNED','DAMAGED','LOST')) DEFAULT 'ASSIGNED'
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id),
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  metadata    TEXT,
  ip_address  TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, entity_id);
