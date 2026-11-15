// 중대재해 점검노트 — 데이터 모델 (Drizzle ORM)
//
// LawChange 와 같은 Supabase 프로젝트(같은 Postgres, 같은 Auth)를 쓰되,
// 테이블은 별도 Postgres 스키마 `safety` 에만 만든다.
//   - 이 프로젝트의 마이그레이션(drizzle/ 폴더)은 safety 스키마만 만들고 바꾼다.
//   - LawChange 가 관리하는 public 스키마(법령 데이터)는 절대 건드리지 않는다.
//   - 법령 변경 데이터는 src/lib/laws/changes.ts 에서 public.legal_* 를 읽기 전용 SQL 로만 조회한다.
//
// 사용자 식별은 Supabase Auth 의 user id(uuid)와 이메일을 그대로 쓴다.

import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import { date, index, integer, jsonb, pgSchema, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const safety = pgSchema("safety");

const id = () => text("id").primaryKey().$defaultFn(() => randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

/** 회사(사업장). 점검·구성원·기록은 모두 회사 단위로 묶인다. */
export const company = safety.table("company", {
  id: id(),
  name: text("name").notNull(),
  siteName: text("site_name"),
  industry: text("industry").notNull(), // MANUFACTURING | CONSTRUCTION | LOGISTICS | SERVICE | OTHER
  employeeBand: text("employee_band").notNull(), // UNDER_5 | 5_49 | 50_299 | 300_499 | 500_PLUS
  ceoName: text("ceo_name"),
  ceoEmail: text("ceo_email"),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

/** 회사 구성원. authUserId 는 처음 로그인할 때 이메일로 연결된다(초대 → 첫 로그인). */
export const member = safety.table(
  "member",
  {
    id: id(),
    companyId: text("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
    authUserId: text("auth_user_id"),
    email: text("email").notNull(),
    name: text("name"),
    role: text("role").default("EDITOR").notNull(), // OWNER | EDITOR | VIEWER
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("member_company_email_uq").on(t.companyId, t.email), index("member_auth_user_idx").on(t.authUserId), index("member_email_idx").on(t.email)],
);

/** 반기 점검 회차. (회사, 연도, 상·하반기) 당 하나. */
export const period = safety.table(
  "period",
  {
    id: id(),
    companyId: text("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    half: integer("half").notNull(), // 1 = 상반기, 2 = 하반기
    startDate: date("start_date", { mode: "date" }).notNull(),
    endDate: date("end_date", { mode: "date" }).notNull(),
    status: text("status").default("OPEN").notNull(), // OPEN | SIGNED
    signedAt: timestamp("signed_at", { withTimezone: true }),
    signedByName: text("signed_by_name"),
    signedByEmail: text("signed_by_email"),
    signNote: text("sign_note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("period_company_half_uq").on(t.companyId, t.year, t.half), index("period_status_end_idx").on(t.status, t.endDate)],
);

/**
 * 점검 항목. 템플릿(src/lib/checklist/templates.ts)에서 회차가 열릴 때 복사된다.
 * 법령 문구가 바뀌어도 과거 기록이 변하지 않도록 제목·근거·안내문을 스냅샷으로 저장한다.
 */
export const checkItem = safety.table(
  "check_item",
  {
    id: id(),
    periodId: text("period_id").notNull().references(() => period.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    basis: text("basis").notNull(),
    guide: text("guide").notNull(),
    cadence: text("cadence").notNull(), // SEMIANNUAL | ANNUAL
    sortOrder: integer("sort_order").notNull(),
    status: text("status").default("PENDING").notNull(), // PENDING | DONE | PARTIAL | NOT_DONE | NA
    note: text("note"),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    checkedBy: text("checked_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("check_item_period_code_uq").on(t.periodId, t.code)],
);

/** 증빙. 파일(스토리지) · 링크 · 메모. */
export const evidence = safety.table(
  "evidence",
  {
    id: id(),
    itemId: text("item_id").notNull().references(() => checkItem.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // FILE | LINK | NOTE
    title: text("title").notNull(),
    url: text("url"),
    storagePath: text("storage_path"),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    size: integer("size"),
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("evidence_item_idx").on(t.itemId)],
);

/** 일부 이행·미이행 항목의 개선 조치. */
export const action = safety.table(
  "action",
  {
    id: id(),
    itemId: text("item_id").notNull().references(() => checkItem.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    ownerName: text("owner_name"),
    dueDate: date("due_date", { mode: "date" }),
    status: text("status").default("OPEN").notNull(), // OPEN | DONE
    doneAt: timestamp("done_at", { withTimezone: true }),
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("action_item_idx").on(t.itemId), index("action_status_due_idx").on(t.status, t.dueDate)],
);

/** 활동 기록 — 누가 언제 무엇을 했는지. 보고서와 5년 보관의 근거. 수정하지 않는다. */
export const activity = safety.table(
  "activity",
  {
    id: id(),
    companyId: text("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
    periodId: text("period_id"),
    itemId: text("item_id"),
    actorEmail: text("actor_email"),
    type: text("type").notNull(),
    summary: text("summary").notNull(),
    detail: jsonb("detail"),
    createdAt: createdAt(),
  },
  (t) => [index("activity_company_created_idx").on(t.companyId, t.createdAt.desc()), index("activity_item_idx").on(t.itemId)],
);

/** 마감 알림 발송 장부 — 같은 알림을 두 번 보내지 않기 위해. */
export const reminderLog = safety.table(
  "reminder_log",
  {
    id: id(),
    periodId: text("period_id").notNull().references(() => period.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // D30 | D7 | D1 | OVERDUE
    sentTo: text("sent_to").notNull(),
    status: text("status").notNull(), // SENT | HELD | FAILED
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("reminder_period_kind_to_uq").on(t.periodId, t.kind, t.sentTo)],
);

/** 관련 법령 변경을 "확인했다"고 표시한 기록. changeEventId 는 public.legal_change_event.id. */
export const lawAck = safety.table(
  "law_ack",
  {
    id: id(),
    companyId: text("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
    changeEventId: text("change_event_id").notNull(),
    ackedBy: text("acked_by"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("law_ack_company_event_uq").on(t.companyId, t.changeEventId)],
);

// ─── 관계 (db.query 의 with 용) ─────────────────────────────────

export const companyRelations = relations(company, ({ many }) => ({ members: many(member), periods: many(period) }));
export const memberRelations = relations(member, ({ one }) => ({ company: one(company, { fields: [member.companyId], references: [company.id] }) }));
export const periodRelations = relations(period, ({ one, many }) => ({
  company: one(company, { fields: [period.companyId], references: [company.id] }),
  items: many(checkItem),
}));
export const checkItemRelations = relations(checkItem, ({ one, many }) => ({
  period: one(period, { fields: [checkItem.periodId], references: [period.id] }),
  evidence: many(evidence),
  actions: many(action),
}));
export const evidenceRelations = relations(evidence, ({ one }) => ({ item: one(checkItem, { fields: [evidence.itemId], references: [checkItem.id] }) }));
export const actionRelations = relations(action, ({ one }) => ({ item: one(checkItem, { fields: [action.itemId], references: [checkItem.id] }) }));

export type Company = typeof company.$inferSelect;
export type Member = typeof member.$inferSelect;
export type Period = typeof period.$inferSelect;
export type CheckItem = typeof checkItem.$inferSelect;
export type Evidence = typeof evidence.$inferSelect;
export type Action = typeof action.$inferSelect;
