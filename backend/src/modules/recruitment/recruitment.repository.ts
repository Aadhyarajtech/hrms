import { all, one, run, nowIso } from "@/db/connection";
import { toCamel } from "@/utils/case";
import { genId } from "@/utils/id";

export function listJobPostings(status?: string) {
  const rows = status
    ? all(
        `SELECT jp.*, d.name as department_name, des.title as designation_title,
                (SELECT COUNT(*) FROM candidates c WHERE c.job_posting_id = jp.id) as candidate_count
         FROM job_postings jp
         JOIN departments d ON d.id = jp.department_id
         JOIN designations des ON des.id = jp.designation_id
         WHERE jp.status = :status ORDER BY jp.posted_at DESC`,
        { status }
      )
    : all(
        `SELECT jp.*, d.name as department_name, des.title as designation_title,
                (SELECT COUNT(*) FROM candidates c WHERE c.job_posting_id = jp.id) as candidate_count
         FROM job_postings jp
         JOIN departments d ON d.id = jp.department_id
         JOIN designations des ON des.id = jp.designation_id
         ORDER BY jp.posted_at DESC`
      );
  return toCamel(rows);
}

export function getJobPosting(id: string) {
  const row = one(
    `SELECT jp.*, d.name as department_name, des.title as designation_title
     FROM job_postings jp JOIN departments d ON d.id = jp.department_id JOIN designations des ON des.id = jp.designation_id
     WHERE jp.id = :id`,
    { id }
  );
  return row ? toCamel(row) : undefined;
}

export interface CreateJobInput {
  title: string;
  departmentId: string;
  designationId: string;
  location?: string;
  employmentType?: string;
  experienceMin?: number;
  experienceMax?: number;
  description: string;
  openings?: number;
}

export function createJobPosting(input: CreateJobInput) {
  const id = genId("job");
  run(
    `INSERT INTO job_postings (id, title, department_id, designation_id, location, employment_type, experience_min, experience_max, description, status, openings, posted_at)
     VALUES (:id, :title, :departmentId, :designationId, :location, :employmentType, :experienceMin, :experienceMax, :description, 'OPEN', :openings, :now)`,
    {
      id,
      title: input.title,
      departmentId: input.departmentId,
      designationId: input.designationId,
      location: input.location ?? "Bengaluru, India",
      employmentType: input.employmentType ?? "FULL_TIME",
      experienceMin: input.experienceMin ?? 0,
      experienceMax: input.experienceMax ?? 5,
      description: input.description,
      openings: input.openings ?? 1,
      now: nowIso(),
    }
  );
  return getJobPosting(id);
}

export function updateJobStatus(id: string, status: string) {
  run(`UPDATE job_postings SET status = :status WHERE id = :id`, { id, status });
  return getJobPosting(id);
}

export function listCandidates(jobPostingId?: string) {
  const rows = jobPostingId
    ? all(
        `SELECT c.*, jp.title as job_title FROM candidates c JOIN job_postings jp ON jp.id = c.job_posting_id
         WHERE c.job_posting_id = :jobPostingId ORDER BY c.applied_at DESC`,
        { jobPostingId }
      )
    : all(`SELECT c.*, jp.title as job_title FROM candidates c JOIN job_postings jp ON jp.id = c.job_posting_id ORDER BY c.applied_at DESC`);
  return toCamel(rows);
}

export function getCandidate(id: string) {
  const row = one(
    `SELECT c.*, jp.title as job_title FROM candidates c JOIN job_postings jp ON jp.id = c.job_posting_id WHERE c.id = :id`,
    { id }
  );
  return row ? toCamel(row) : undefined;
}

export interface CreateCandidateInput {
  jobPostingId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  expectedCtc?: number;
  source?: string;
  notes?: string;
}

export function createCandidate(input: CreateCandidateInput) {
  const id = genId("cand");
  run(
    `INSERT INTO candidates (id, job_posting_id, first_name, last_name, email, phone, expected_ctc, source, notes, stage, applied_at)
     VALUES (:id, :jobPostingId, :firstName, :lastName, :email, :phone, :expectedCtc, :source, :notes, 'APPLIED', :now)`,
    {
      id,
      jobPostingId: input.jobPostingId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? null,
      expectedCtc: input.expectedCtc ?? null,
      source: input.source ?? "Career Site",
      notes: input.notes ?? null,
      now: nowIso(),
    }
  );
  return getCandidate(id);
}

export function moveCandidateStage(id: string, stage: string) {
  run(`UPDATE candidates SET stage = :stage WHERE id = :id`, { id, stage });
  return getCandidate(id);
}

export function rateCandidate(id: string, rating: number) {
  run(`UPDATE candidates SET rating = :rating WHERE id = :id`, { id, rating });
  return getCandidate(id);
}

export function listInterviews(candidateId?: string) {
  const rows = candidateId
    ? all(
        `SELECT i.*, e.first_name as interviewer_first_name, e.last_name as interviewer_last_name
         FROM interviews i JOIN employees e ON e.id = i.interviewer_id WHERE i.candidate_id = :candidateId ORDER BY i.scheduled_at ASC`,
        { candidateId }
      )
    : all(
        `SELECT i.*, c.first_name as candidate_first_name, c.last_name as candidate_last_name,
                e.first_name as interviewer_first_name, e.last_name as interviewer_last_name
         FROM interviews i
         JOIN candidates c ON c.id = i.candidate_id
         JOIN employees e ON e.id = i.interviewer_id
         ORDER BY i.scheduled_at ASC`
      );
  return toCamel(rows);
}

export function scheduleInterview(input: { candidateId: string; interviewerId: string; scheduledAt: string; round?: string }) {
  const id = genId("intv");
  run(
    `INSERT INTO interviews (id, candidate_id, interviewer_id, scheduled_at, round) VALUES (:id, :candidateId, :interviewerId, :scheduledAt, :round)`,
    { id, candidateId: input.candidateId, interviewerId: input.interviewerId, scheduledAt: input.scheduledAt, round: input.round ?? "Round 1" }
  );
  return toCamel(one(`SELECT * FROM interviews WHERE id = :id`, { id }));
}

export function submitInterviewFeedback(id: string, feedback: string, recommendation: string) {
  run(`UPDATE interviews SET feedback = :feedback, recommendation = :recommendation, completed = 1 WHERE id = :id`, {
    id,
    feedback,
    recommendation,
  });
  return toCamel(one(`SELECT * FROM interviews WHERE id = :id`, { id }));
}

export function getPipelineSummary() {
  const rows = all(`SELECT stage, COUNT(*) as count FROM candidates GROUP BY stage`);
  return toCamel(rows);
}

export function getOpenRolesCount() {
  const row = one<{ count: number }>(`SELECT COUNT(*) as count FROM job_postings WHERE status = 'OPEN'`);
  return row?.count ?? 0;
}
