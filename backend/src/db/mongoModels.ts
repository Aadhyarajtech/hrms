// Auto-generated Mongoose schemas converted from src/db/schema.sql
import mongoose, { Schema } from 'mongoose';

const { model } = mongoose;

// NOTE: original SQL used TEXT primary keys; we keep `_id` as String so existing IDs can be reused.

const userSchema = new Schema(
  {
    _id: { type: String },
    email: { type: String, required: true, unique: true, index: true },
    password_hash: { type: String, required: true },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'RECRUITER', 'FINANCE', 'EMPLOYEE'],
      default: 'EMPLOYEE',
    },
    is_active: { type: Boolean, default: true },
    must_reset_pwd: { type: Boolean, default: false },
    last_login_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, _id: false }
);

const departmentSchema = new Schema(
  {
    _id: { type: String },
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    description: { type: String },
    color_hex: { type: String, default: '#5B4FE5' },
    head_id: { type: String, ref: 'Employee' },
    created_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const designationSchema = new Schema(
  {
    _id: { type: String },
    title: { type: String, required: true },
    level: { type: Number, default: 1 },
    department_id: { type: String, ref: 'Department', required: true },
  },
  { _id: false }
);
designationSchema.index({ title: 1, department_id: 1 }, { unique: true });

const employeeSchema = new Schema(
  {
    _id: { type: String },
    employee_code: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, ref: 'User', required: true, unique: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    avatar_url: { type: String },
    gender: { type: String },
    date_of_birth: { type: Date },
    personal_email: { type: String },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    country: { type: String, default: 'India' },
    department_id: { type: String, ref: 'Department', required: true, index: true },
    designation_id: { type: String, ref: 'Designation', required: true },
    manager_id: { type: String, ref: 'Employee', index: true },
    employment_type: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
      default: 'FULL_TIME',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ON_LEAVE', 'NOTICE_PERIOD', 'TERMINATED', 'RESIGNED'],
      default: 'ACTIVE',
    },
    date_of_joining: { type: Date, required: true },
    date_of_exit: { type: Date },
    emergency_contact_name: { type: String },
    emergency_contact_phone: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, _id: false }
);

const attendanceSchema = new Schema(
  {
    _id: { type: String },
    employee_id: { type: String, ref: 'Employee', required: true },
    date: { type: Date, required: true, index: true },
    check_in: { type: Date },
    check_out: { type: Date },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'WORK_FROM_HOME', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND'],
      default: 'PRESENT',
    },
    work_hours: { type: Number },
    is_regularized: { type: Boolean, default: false },
    note: { type: String },
    created_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);
attendanceSchema.index({ employee_id: 1, date: 1 }, { unique: true });

const holidaySchema = new Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    date: { type: Date, required: true, unique: true },
    is_optional: { type: Boolean, default: false },
  },
  { _id: false }
);

const leaveTypeSchema = new Schema(
  {
    _id: { type: String },
    name: { type: String, required: true, unique: true },
    color_hex: { type: String, default: '#5B4FE5' },
    default_days_per_year: { type: Number, default: 12 },
    is_paid: { type: Boolean, default: true },
    requires_approval: { type: Boolean, default: true },
  },
  { _id: false }
);

const leaveBalanceSchema = new Schema(
  {
    _id: { type: String },
    employee_id: { type: String, ref: 'Employee', required: true },
    leave_type_id: { type: String, ref: 'LeaveType', required: true },
    year: { type: Number, required: true },
    allotted: { type: Number, required: true },
    used: { type: Number, default: 0 },
    carried_over: { type: Number, default: 0 },
  },
  { _id: false }
);
leaveBalanceSchema.index({ employee_id: 1, leave_type_id: 1, year: 1 }, { unique: true });

const leaveRequestSchema = new Schema(
  {
    _id: { type: String },
    employee_id: { type: String, ref: 'Employee', required: true, index: true },
    leave_type_id: { type: String, ref: 'LeaveType', required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    total_days: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
    approver_id: { type: String, ref: 'Employee' },
    decision_note: { type: String },
    applied_at: { type: Date, required: true },
    decided_at: { type: Date },
  },
  { _id: false }
);
leaveRequestSchema.index({ employee_id: 1 });
leaveRequestSchema.index({ status: 1 });

const jobPostingSchema = new Schema(
  {
    _id: { type: String },
    title: { type: String, required: true },
    department_id: { type: String, ref: 'Department', required: true },
    designation_id: { type: String, ref: 'Designation', required: true },
    location: { type: String, default: 'Bengaluru, India' },
    employment_type: { type: String, enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'], default: 'FULL_TIME' },
    experience_min: { type: Number, default: 0 },
    experience_max: { type: Number, default: 5 },
    description: { type: String, required: true },
    status: { type: String, enum: ['OPEN', 'ON_HOLD', 'CLOSED'], default: 'OPEN' },
    openings: { type: Number, default: 1 },
    posted_at: { type: Date, required: true },
  },
  { _id: false }
);

const candidateSchema = new Schema(
  {
    _id: { type: String },
    job_posting_id: { type: String, ref: 'JobPosting', required: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    resume_url: { type: String },
    stage: { type: String, enum: ['APPLIED','SCREENING','INTERVIEW','OFFER','HIRED','REJECTED'], default: 'APPLIED' },
    rating: { type: Number },
    expected_ctc: { type: Number },
    source: { type: String, default: 'Career Site' },
    referred_by_id: { type: String, ref: 'Employee' },
    applied_at: { type: Date, required: true },
    notes: { type: String },
  },
  { _id: false }
);
candidateSchema.index({ stage: 1 });

const interviewSchema = new Schema(
  {
    _id: { type: String },
    candidate_id: { type: String, ref: 'Candidate', required: true },
    interviewer_id: { type: String, ref: 'Employee', required: true },
    scheduled_at: { type: Date, required: true },
    round: { type: String, default: 'Round 1' },
    feedback: { type: String },
    recommendation: { type: String },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const performanceCycleSchema = new Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    is_active: { type: Boolean, default: true },
  },
  { _id: false }
);

const performanceReviewSchema = new Schema(
  {
    _id: { type: String },
    cycle_id: { type: String, ref: 'PerformanceCycle', required: true },
    reviewee_id: { type: String, ref: 'Employee', required: true },
    reviewer_id: { type: String, ref: 'Employee', required: true },
    status: { type: String, enum: ['NOT_STARTED','SELF_REVIEW','MANAGER_REVIEW','COMPLETED'], default: 'NOT_STARTED' },
    self_rating: { type: Number },
    manager_rating: { type: Number },
    final_rating: { type: Number },
    strengths: { type: String },
    improvements: { type: String },
    manager_comments: { type: String },
    submitted_at: { type: Date },
  },
  { _id: false }
);
performanceReviewSchema.index({ cycle_id: 1, reviewee_id: 1 }, { unique: true });

const goalSchema = new Schema(
  {
    _id: { type: String },
    employee_id: { type: String, ref: 'Employee', required: true },
    title: { type: String, required: true },
    description: { type: String },
    progress: { type: Number, default: 0 },
    status: { type: String, enum: ['NOT_STARTED','IN_PROGRESS','AT_RISK','COMPLETED'], default: 'NOT_STARTED' },
    due_date: { type: Date, required: true },
    created_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const salaryStructureSchema = new Schema(
  {
    _id: { type: String },
    employee_id: { type: String, ref: 'Employee', required: true, unique: true },
    basic: { type: Number, required: true },
    hra: { type: Number, required: true },
    conveyance: { type: Number, required: true },
    medical: { type: Number, required: true },
    special_allowance: { type: Number, required: true },
    pf: { type: Number, required: true },
    professional_tax: { type: Number, required: true },
    income_tax: { type: Number, required: true },
    effective_from: { type: Date, required: true },
  },
  { _id: false }
);

const payrollRunSchema = new Schema(
  {
    _id: { type: String },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    status: { type: String, enum: ['DRAFT','PROCESSED','PAID'], default: 'DRAFT' },
    processed_at: { type: Date },
    total_gross: { type: Number, default: 0 },
    total_deductions: { type: Number, default: 0 },
    total_net: { type: Number, default: 0 },
    headcount: { type: Number, default: 0 },
  },
  { _id: false }
);
payrollRunSchema.index({ month: 1, year: 1 }, { unique: true });

const payslipSchema = new Schema(
  {
    _id: { type: String },
    payroll_run_id: { type: String, ref: 'PayrollRun', required: true },
    employee_id: { type: String, ref: 'Employee', required: true },
    basic: { type: Number, required: true },
    hra: { type: Number, required: true },
    conveyance: { type: Number, required: true },
    medical: { type: Number, required: true },
    special_allowance: { type: Number, required: true },
    gross_earnings: { type: Number, required: true },
    pf: { type: Number, required: true },
    professional_tax: { type: Number, required: true },
    income_tax: { type: Number, required: true },
    lop: { type: Number, default: 0 },
    total_deductions: { type: Number, required: true },
    net_pay: { type: Number, required: true },
    days_payable: { type: Number, required: true },
    days_in_month: { type: Number, required: true },
  },
  { _id: false }
);
payslipSchema.index({ payroll_run_id: 1, employee_id: 1 }, { unique: true });

const announcementSchema = new Schema(
  {
    _id: { type: String },
    title: { type: String, required: true },
    body: { type: String, required: true },
    pinned: { type: Boolean, default: false },
    audience: { type: String, default: 'ALL' },
    created_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const notificationSchema = new Schema(
  {
    _id: { type: String },
    user_id: { type: String, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['LEAVE_REQUEST','LEAVE_DECISION','ANNOUNCEMENT','PAYROLL','PERFORMANCE','RECRUITMENT','SYSTEM'], default: 'SYSTEM' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    is_read: { type: Boolean, default: false },
    link: { type: String },
    created_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);
notificationSchema.index({ user_id: 1, is_read: 1 });

const documentSchema = new Schema(
  {
    _id: { type: String },
    employee_id: { type: String, ref: 'Employee', required: true },
    type: { type: String, enum: ['OFFER_LETTER','ID_PROOF','ADDRESS_PROOF','EDUCATIONAL','CONTRACT','OTHER'], default: 'OTHER' },
    file_name: { type: String, required: true },
    file_url: { type: String, required: true },
    uploaded_at: { type: Date, required: true },
  },
  { _id: false }
);

const assetSchema = new Schema(
  {
    _id: { type: String },
    employee_id: { type: String, ref: 'Employee', required: true },
    asset_tag: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    name: { type: String, required: true },
    assigned_at: { type: Date, required: true },
    returned_at: { type: Date },
    status: { type: String, enum: ['ASSIGNED','RETURNED','DAMAGED','LOST'], default: 'ASSIGNED' },
  },
  { _id: false }
);

const auditLogSchema = new Schema(
  {
    _id: { type: String },
    user_id: { type: String, ref: 'User' },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entity_id: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ip_address: { type: String },
    created_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);
auditLogSchema.index({ entity: 1, entity_id: 1 });

// Export models
export const User = model('User', userSchema);
export const Department = model('Department', departmentSchema);
export const Designation = model('Designation', designationSchema);
export const Employee = model('Employee', employeeSchema);
export const Attendance = model('Attendance', attendanceSchema);
export const Holiday = model('Holiday', holidaySchema);
export const LeaveType = model('LeaveType', leaveTypeSchema);
export const LeaveBalance = model('LeaveBalance', leaveBalanceSchema);
export const LeaveRequest = model('LeaveRequest', leaveRequestSchema);
export const JobPosting = model('JobPosting', jobPostingSchema);
export const Candidate = model('Candidate', candidateSchema);
export const Interview = model('Interview', interviewSchema);
export const PerformanceCycle = model('PerformanceCycle', performanceCycleSchema);
export const PerformanceReview = model('PerformanceReview', performanceReviewSchema);
export const Goal = model('Goal', goalSchema);
export const SalaryStructure = model('SalaryStructure', salaryStructureSchema);
export const PayrollRun = model('PayrollRun', payrollRunSchema);
export const Payslip = model('Payslip', payslipSchema);
export const Announcement = model('Announcement', announcementSchema);
export const Notification = model('Notification', notificationSchema);
export const Document = model('Document', documentSchema);
export const Asset = model('Asset', assetSchema);
export const AuditLog = model('AuditLog', auditLogSchema);

export default {
  User,
  Department,
  Designation,
  Employee,
  Attendance,
  Holiday,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  JobPosting,
  Candidate,
  Interview,
  PerformanceCycle,
  PerformanceReview,
  Goal,
  SalaryStructure,
  PayrollRun,
  Payslip,
  Announcement,
  Notification,
  Document,
  Asset,
  AuditLog,
};
