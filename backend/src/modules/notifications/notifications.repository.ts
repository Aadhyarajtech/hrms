import { all, run, one, nowIso } from "@/db/connection";
import { toCamel } from "@/utils/case";
import { genId } from "@/utils/id";

export type NotificationType =
  | "LEAVE_REQUEST"
  | "LEAVE_DECISION"
  | "ANNOUNCEMENT"
  | "PAYROLL"
  | "PERFORMANCE"
  | "RECRUITMENT"
  | "SYSTEM";

export function notify(input: { userId: string; type: NotificationType; title: string; message: string; link?: string }) {
  const id = genId("ntf");
  run(
    `INSERT INTO notifications (id, user_id, type, title, message, link, created_at)
     VALUES (:id, :userId, :type, :title, :message, :link, :now)`,
    { id, userId: input.userId, type: input.type, title: input.title, message: input.message, link: input.link ?? null, now: nowIso() }
  );
  return id;
}

export function listNotifications(userId: string, unreadOnly = false) {
  const rows = unreadOnly
    ? all(`SELECT * FROM notifications WHERE user_id = :userId AND is_read = 0 ORDER BY created_at DESC LIMIT 50`, { userId })
    : all(`SELECT * FROM notifications WHERE user_id = :userId ORDER BY created_at DESC LIMIT 50`, { userId });
  return toCamel(rows);
}

export function unreadCount(userId: string) {
  const row = one<{ count: number }>(`SELECT COUNT(*) as count FROM notifications WHERE user_id = :userId AND is_read = 0`, { userId });
  return row?.count ?? 0;
}

export function markRead(id: string, userId: string) {
  run(`UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :userId`, { id, userId });
}

export function markAllRead(userId: string) {
  run(`UPDATE notifications SET is_read = 1 WHERE user_id = :userId`, { userId });
}

export function listAnnouncements() {
  const rows = all(`SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC`);
  return toCamel(rows);
}

export function createAnnouncement(input: { title: string; body: string; pinned?: boolean; audience?: string }) {
  const id = genId("ann");
  run(
    `INSERT INTO announcements (id, title, body, pinned, audience, created_at)
     VALUES (:id, :title, :body, :pinned, :audience, :now)`,
    { id, title: input.title, body: input.body, pinned: input.pinned ? 1 : 0, audience: input.audience ?? "ALL", now: nowIso() }
  );
  return toCamel(one(`SELECT * FROM announcements WHERE id = :id`, { id }));
}
