import { all, one, run, nowIso } from "@/db/connection";
import { toCamel } from "@/utils/case";
import { genId } from "@/utils/id";

export function listDocuments(employeeId: string) {
  return toCamel(all(`SELECT * FROM documents WHERE employee_id = :employeeId ORDER BY uploaded_at DESC`, { employeeId }));
}

export function addDocument(input: { employeeId: string; type: string; fileName: string; fileUrl: string }) {
  const id = genId("doc");
  run(
    `INSERT INTO documents (id, employee_id, type, file_name, file_url, uploaded_at) VALUES (:id, :employeeId, :type, :fileName, :fileUrl, :now)`,
    { id, ...input, now: nowIso() }
  );
  return toCamel(one(`SELECT * FROM documents WHERE id = :id`, { id }));
}

export function deleteDocument(id: string) {
  run(`DELETE FROM documents WHERE id = :id`, { id });
}

export function getDocument(id: string) {
  const row = one(`SELECT * FROM documents WHERE id = :id`, { id });
  return row ? toCamel(row) : undefined;
}

// --- Assets ---
export function listAssets(employeeId?: string) {
  const rows = employeeId
    ? all(`SELECT * FROM assets WHERE employee_id = :employeeId ORDER BY assigned_at DESC`, { employeeId })
    : all(
        `SELECT a.*, e.first_name, e.last_name, e.employee_code FROM assets a JOIN employees e ON e.id = a.employee_id ORDER BY a.assigned_at DESC`
      );
  return toCamel(rows);
}

export function assignAsset(input: { employeeId: string; assetTag: string; category: string; name: string }) {
  const id = genId("ast");
  run(
    `INSERT INTO assets (id, employee_id, asset_tag, category, name, assigned_at, status) VALUES (:id, :employeeId, :assetTag, :category, :name, :now, 'ASSIGNED')`,
    { id, ...input, now: nowIso() }
  );
  return toCamel(one(`SELECT * FROM assets WHERE id = :id`, { id }));
}

export function updateAssetStatus(id: string, status: string) {
  const returnedAt = status === "RETURNED" ? nowIso() : null;
  run(`UPDATE assets SET status = :status, returned_at = :returnedAt WHERE id = :id`, { id, status, returnedAt });
  return toCamel(one(`SELECT * FROM assets WHERE id = :id`, { id }));
}
