"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  action as actionT,
  checkItem as checkItemT,
  company as companyT,
  db,
  evidence as evidenceT,
  lawAck as lawAckT,
  member as memberT,
  period as periodT,
} from "@/lib/db";
import { findMemberContext, getAuthUser, requireEditor, requireMember, requireOwner } from "@/lib/auth/session";
import { ensureCurrentPeriod, getItemForCompany, logActivity } from "@/lib/domain/periods";
import { STATUS_LABEL } from "@/lib/checklist/templates";
import { repairFileName, saveEvidenceFile } from "@/lib/storage/evidence-storage";
import type { ActionResult } from "@/components/ActionForm";

function fail(message: string): ActionResult {
  return { ok: false, message };
}

function errorMessage(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? "입력값을 확인해 주세요.";
  if (err instanceof Error) return err.message;
  return "처리하지 못했습니다.";
}

const str = (max: number) => z.string().trim().max(max, `${max}자 이내로 입력해 주세요.`);
const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max}자 이내로 입력해 주세요.`)
    .optional()
    .transform((v) => (v ? v : undefined));

// ─── 회사 등록 (온보딩) ──────────────────────────────────────────

const CompanySchema = z.object({
  name: str(80).min(1, "회사 이름을 입력해 주세요."),
  siteName: optStr(80),
  industry: z.enum(["MANUFACTURING", "CONSTRUCTION", "LOGISTICS", "SERVICE", "OTHER"], { message: "업종을 골라 주세요." }),
  employeeBand: z.enum(["UNDER_5", "5_49", "50_299", "300_499", "500_PLUS"], { message: "직원 수를 골라 주세요." }),
  ceoName: optStr(40),
  ceoEmail: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(z.string().email("경영책임자 이메일 형식을 확인해 주세요.").optional()),
  myName: optStr(40),
});

export async function createCompany(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return fail("로그인이 필요합니다.");
  if (await findMemberContext(user)) redirect("/app");

  let input: z.infer<typeof CompanySchema>;
  try {
    input = CompanySchema.parse(Object.fromEntries(formData));
  } catch (err) {
    return fail(errorMessage(err));
  }

  const company = await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(companyT)
      .values({
        name: input.name,
        siteName: input.siteName,
        industry: input.industry,
        employeeBand: input.employeeBand,
        ceoName: input.ceoName,
        ceoEmail: input.ceoEmail,
      })
      .returning();
    await tx.insert(memberT).values({ companyId: c.id, email: user.email, authUserId: user.id, name: input.myName, role: "OWNER" });
    return c;
  });
  await logActivity({ companyId: company.id, actorEmail: user.email, type: "COMPANY_CREATED", summary: `회사 등록: ${company.name}` });
  const period = await ensureCurrentPeriod(company);
  redirect(`/app/periods/${period.id}`);
}

// ─── 점검 항목 ───────────────────────────────────────────────────

async function editableItem(itemId: string) {
  const ctx = await requireEditor();
  const item = await getItemForCompany(ctx.company.id, itemId);
  if (!item) throw new Error("항목을 찾을 수 없습니다.");
  if (item.period.status === "SIGNED") throw new Error("경영책임자 확인이 끝난 회차는 수정할 수 없습니다.");
  return { ctx, item };
}

const StatusSchema = z.object({
  itemId: z.string().min(1),
  status: z.enum(["PENDING", "DONE", "PARTIAL", "NOT_DONE", "NA"]),
  note: optStr(2000),
});

export async function updateItemStatus(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const input = StatusSchema.parse(Object.fromEntries(formData));
    const { ctx, item } = await editableItem(input.itemId);
    if (input.status === "NA" && !input.note) return fail("'해당 없음'은 이유를 메모에 적어 주세요. 보고서에 그대로 남습니다.");
    await db
      .update(checkItemT)
      .set({
        status: input.status,
        note: input.note ?? null,
        checkedAt: input.status === "PENDING" ? null : new Date(),
        checkedBy: input.status === "PENDING" ? null : ctx.user.email,
      })
      .where(eq(checkItemT.id, item.id));
    await logActivity({
      companyId: ctx.company.id,
      periodId: item.periodId,
      itemId: item.id,
      actorEmail: ctx.user.email,
      type: "ITEM_STATUS",
      summary: `「${item.title}」 → ${STATUS_LABEL[input.status]}`,
      detail: { from: item.status, to: input.status, note: input.note ?? null },
    });
    revalidatePath(`/app/items/${item.id}`);
    revalidatePath(`/app/periods/${item.periodId}`);
    return { ok: true, message: "저장했습니다." };
  } catch (err) {
    return fail(errorMessage(err));
  }
}

// ─── 증빙 ────────────────────────────────────────────────────────

export async function addEvidence(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const itemId = String(formData.get("itemId") ?? "");
    const kind = String(formData.get("kind") ?? "");
    const { ctx, item } = await editableItem(itemId);

    if (kind === "FILE") {
      const file = formData.get("file");
      if (!(file instanceof File) || file.size === 0) return fail("파일을 골라 주세요.");
      const { storagePath } = await saveEvidenceFile({ companyId: ctx.company.id, periodId: item.periodId, itemId: item.id, file });
      const fileName = repairFileName(file.name);
      const title = String(formData.get("title") ?? "").trim() || fileName;
      await db.insert(evidenceT).values({ itemId: item.id, kind: "FILE", title: title.slice(0, 200), storagePath, fileName: fileName.slice(0, 200), mimeType: file.type || null, size: file.size, createdBy: ctx.user.email });
      await logActivity({ companyId: ctx.company.id, periodId: item.periodId, itemId: item.id, actorEmail: ctx.user.email, type: "EVIDENCE_ADDED", summary: `증빙 파일 추가: ${title}` });
    } else if (kind === "LINK") {
      const parsed = z
        .object({ title: str(200).min(1, "제목을 입력해 주세요."), url: z.string().trim().url("링크 주소를 확인해 주세요.").refine((u) => /^https?:\/\//.test(u), "http(s) 링크만 넣을 수 있습니다.") })
        .parse({ title: formData.get("title"), url: formData.get("url") });
      await db.insert(evidenceT).values({ itemId: item.id, kind: "LINK", title: parsed.title, url: parsed.url, createdBy: ctx.user.email });
      await logActivity({ companyId: ctx.company.id, periodId: item.periodId, itemId: item.id, actorEmail: ctx.user.email, type: "EVIDENCE_ADDED", summary: `증빙 링크 추가: ${parsed.title}` });
    } else if (kind === "NOTE") {
      const title = str(2000).min(1, "내용을 입력해 주세요.").parse(formData.get("title"));
      await db.insert(evidenceT).values({ itemId: item.id, kind: "NOTE", title, createdBy: ctx.user.email });
      await logActivity({ companyId: ctx.company.id, periodId: item.periodId, itemId: item.id, actorEmail: ctx.user.email, type: "EVIDENCE_ADDED", summary: "증빙 메모 추가" });
    } else {
      return fail("증빙 종류를 골라 주세요.");
    }
    revalidatePath(`/app/items/${item.id}`);
    revalidatePath(`/app/periods/${item.periodId}`);
    return { ok: true, message: "증빙을 추가했습니다." };
  } catch (err) {
    return fail(errorMessage(err));
  }
}

export async function removeEvidence(formData: FormData): Promise<void> {
  const evidenceId = String(formData.get("evidenceId") ?? "");
  const ctx = await requireEditor();
  const [row] = await db
    .select({ ev: evidenceT, periodId: periodT.id, periodStatus: periodT.status })
    .from(evidenceT)
    .innerJoin(checkItemT, eq(checkItemT.id, evidenceT.itemId))
    .innerJoin(periodT, eq(periodT.id, checkItemT.periodId))
    .where(and(eq(evidenceT.id, evidenceId), eq(periodT.companyId, ctx.company.id)))
    .limit(1);
  if (!row) throw new Error("증빙을 찾을 수 없습니다.");
  if (row.periodStatus === "SIGNED") throw new Error("확인이 끝난 회차의 증빙은 지울 수 없습니다.");
  const ev = { ...row.ev, item: { periodId: row.periodId } };
  await db.delete(evidenceT).where(eq(evidenceT.id, ev.id));
  // 파일 자체는 지우지 않는다 — 보관 의무 기간 동안 실수로 지운 증빙을 되살릴 수 있게.
  await logActivity({ companyId: ctx.company.id, periodId: ev.item.periodId, itemId: ev.itemId, actorEmail: ctx.user.email, type: "EVIDENCE_REMOVED", summary: `증빙 삭제: ${ev.title.slice(0, 60)}`, detail: { storagePath: ev.storagePath, url: ev.url } });
  revalidatePath(`/app/items/${ev.itemId}`);
}

// ─── 개선 조치 ───────────────────────────────────────────────────

const ActionSchema = z.object({
  itemId: z.string().min(1),
  description: str(500).min(1, "무엇을 할지 적어 주세요."),
  ownerName: optStr(40),
  dueDate: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "기한 형식을 확인해 주세요."),
});

export async function addAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const input = ActionSchema.parse(Object.fromEntries(formData));
    const { ctx, item } = await editableItem(input.itemId);
    await db.insert(actionT).values({ itemId: item.id, description: input.description, ownerName: input.ownerName, dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00Z`) : null, createdBy: ctx.user.email });
    await logActivity({ companyId: ctx.company.id, periodId: item.periodId, itemId: item.id, actorEmail: ctx.user.email, type: "ACTION_ADDED", summary: `개선 조치 등록: ${input.description.slice(0, 60)}` });
    revalidatePath(`/app/items/${item.id}`);
    revalidatePath(`/app/periods/${item.periodId}`);
    return { ok: true, message: "개선 조치를 등록했습니다." };
  } catch (err) {
    return fail(errorMessage(err));
  }
}

/** 조치 완료 처리. 지난 회차에서 넘어온 조치도 완료할 수 있어야 하므로 회차 잠금과 무관하다. */
export async function toggleAction(formData: FormData): Promise<void> {
  const actionId = String(formData.get("actionId") ?? "");
  const ctx = await requireEditor();
  const [row] = await db
    .select({ action: actionT, periodId: checkItemT.periodId })
    .from(actionT)
    .innerJoin(checkItemT, eq(checkItemT.id, actionT.itemId))
    .innerJoin(periodT, eq(periodT.id, checkItemT.periodId))
    .where(and(eq(actionT.id, actionId), eq(periodT.companyId, ctx.company.id)))
    .limit(1);
  if (!row) throw new Error("조치를 찾을 수 없습니다.");
  const action = { ...row.action, item: { periodId: row.periodId } };
  const done = action.status !== "DONE";
  await db.update(actionT).set({ status: done ? "DONE" : "OPEN", doneAt: done ? new Date() : null }).where(eq(actionT.id, action.id));
  await logActivity({ companyId: ctx.company.id, periodId: action.item.periodId, itemId: action.itemId, actorEmail: ctx.user.email, type: done ? "ACTION_DONE" : "ACTION_REOPENED", summary: `${done ? "조치 완료" : "조치 다시 열기"}: ${action.description.slice(0, 60)}` });
  revalidatePath(`/app/items/${action.itemId}`);
  revalidatePath(`/app/periods/${action.item.periodId}`);
  revalidatePath("/app");
}

// ─── 경영책임자 확인 ─────────────────────────────────────────────

const SignSchema = z.object({
  periodId: z.string().min(1),
  signedByName: str(40).min(1, "확인하는 분의 이름을 입력해 주세요."),
  signNote: optStr(1000),
  confirm: z.literal("on", { message: "내용을 확인했다는 체크가 필요합니다." }),
});

export async function signPeriod(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const input = SignSchema.parse(Object.fromEntries(formData));
    const ctx = await requireMember();
    const canSign = ctx.member.role === "OWNER" || (ctx.company.ceoEmail && ctx.company.ceoEmail === ctx.user.email);
    if (!canSign) return fail("회사 관리자 또는 경영책임자로 등록된 이메일만 확인할 수 있습니다.");
    const period = await db.query.period.findFirst({
      where: and(eq(periodT.id, input.periodId), eq(periodT.companyId, ctx.company.id)),
      with: { items: { columns: { status: true } } },
    });
    if (!period) return fail("회차를 찾을 수 없습니다.");
    if (period.status === "SIGNED") return fail("이미 확인이 끝난 회차입니다.");
    const pending = period.items.filter((i) => i.status === "PENDING").length;
    if (pending > 0) return fail(`아직 점검하지 않은 항목이 ${pending}개 있습니다. 모든 항목의 결과를 먼저 입력해 주세요.`);
    // 상태가 OPEN 일 때만 바꾼다 — 두 사람이 동시에 확인해도 한 번만 기록된다.
    const signed = await db
      .update(periodT)
      .set({ status: "SIGNED", signedAt: new Date(), signedByName: input.signedByName, signedByEmail: ctx.user.email, signNote: input.signNote ?? null })
      .where(and(eq(periodT.id, period.id), eq(periodT.status, "OPEN")))
      .returning({ id: periodT.id });
    if (signed.length === 0) return fail("이미 확인이 끝난 회차입니다.");
    await logActivity({ companyId: ctx.company.id, periodId: period.id, actorEmail: ctx.user.email, type: "PERIOD_SIGNED", summary: `경영책임자 확인: ${input.signedByName}`, detail: { note: input.signNote ?? null } });
    revalidatePath(`/app/periods/${period.id}`);
    revalidatePath(`/app/periods/${period.id}/report`);
    return { ok: true, message: "확인을 기록했습니다. 이 회차는 이제 수정할 수 없습니다." };
  } catch (err) {
    return fail(errorMessage(err));
  }
}

// ─── 법령 변경 확인 ──────────────────────────────────────────────

export async function ackLawChange(formData: FormData): Promise<void> {
  const ctx = await requireEditor();
  const changeEventId = z.string().min(1).max(64).parse(formData.get("eventId"));
  const title = String(formData.get("title") ?? "").slice(0, 120);
  await db.insert(lawAckT).values({ companyId: ctx.company.id, changeEventId, ackedBy: ctx.user.email }).onConflictDoNothing();
  await logActivity({ companyId: ctx.company.id, actorEmail: ctx.user.email, type: "LAW_ACK", summary: `법령 변경 확인: ${title}`, detail: { changeEventId } });
  revalidatePath("/app/laws");
  revalidatePath("/app");
}

// ─── 회사 설정 · 구성원 ──────────────────────────────────────────

export async function updateCompany(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireOwner();
    const input = CompanySchema.omit({ myName: true }).parse(Object.fromEntries(formData));
    await db
      .update(companyT)
      .set({ ...input, siteName: input.siteName ?? null, ceoName: input.ceoName ?? null, ceoEmail: input.ceoEmail ?? null })
      .where(eq(companyT.id, ctx.company.id));
    await logActivity({ companyId: ctx.company.id, actorEmail: ctx.user.email, type: "COMPANY_UPDATED", summary: "회사 정보 수정" });
    revalidatePath("/app", "layout");
    return { ok: true, message: "저장했습니다. 직원 수 변경은 다음 회차부터 항목에 반영됩니다." };
  } catch (err) {
    return fail(errorMessage(err));
  }
}

const InviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("이메일 형식을 확인해 주세요."),
  name: optStr(40),
  role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
});

export async function inviteMember(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireOwner();
    const input = InviteSchema.parse(Object.fromEntries(formData));
    const inserted = await db
      .insert(memberT)
      .values({ companyId: ctx.company.id, email: input.email, name: input.name, role: input.role })
      .onConflictDoNothing()
      .returning({ id: memberT.id });
    if (inserted.length === 0) return fail("이미 등록된 이메일입니다.");
    await logActivity({ companyId: ctx.company.id, actorEmail: ctx.user.email, type: "MEMBER_INVITED", summary: `구성원 추가: ${input.email}` });
    revalidatePath("/app/settings");
    return { ok: true, message: `${input.email} 님을 추가했습니다. 그 이메일로 로그인하면 바로 이 회사로 연결됩니다.` };
  } catch (err) {
    return fail(errorMessage(err));
  }
}

export async function removeMember(formData: FormData): Promise<void> {
  const ctx = await requireOwner();
  const memberId = String(formData.get("memberId") ?? "");
  if (memberId === ctx.member.id) throw new Error("자기 자신은 뺄 수 없습니다.");
  const [m] = await db.select().from(memberT).where(and(eq(memberT.id, memberId), eq(memberT.companyId, ctx.company.id))).limit(1);
  if (!m) throw new Error("구성원을 찾을 수 없습니다.");
  await db.delete(memberT).where(eq(memberT.id, m.id));
  await logActivity({ companyId: ctx.company.id, actorEmail: ctx.user.email, type: "MEMBER_REMOVED", summary: `구성원 제외: ${m.email}` });
  revalidatePath("/app/settings");
}

export async function openPeriod(formData: FormData): Promise<void> {
  // 지난 회차를 늦게라도 기록하고 싶을 때 (예: 서비스를 하반기에 시작했지만 상반기 점검 기록을 남기려는 경우)
  const ctx = await requireEditor();
  const year = Number(formData.get("year"));
  const half = Number(formData.get("half"));
  if (!Number.isInteger(year) || year < 2022 || year > 2100 || (half !== 1 && half !== 2)) throw new Error("회차를 확인해 주세요.");
  const { ensurePeriod } = await import("@/lib/domain/periods");
  const period = await ensurePeriod(ctx.company, { year, half: half as 1 | 2 });
  redirect(`/app/periods/${period.id}`);
}
