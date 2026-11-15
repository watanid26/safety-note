import "server-only";
import { and, asc, eq } from "drizzle-orm";
import {
  action as actionT,
  activity as activityT,
  checkItem as checkItemT,
  db,
  period as periodT,
  type Company,
  type Period,
} from "@/lib/db";
import { templatesFor, type EmployeeBand } from "@/lib/checklist/templates";
import { currentHalf, previousHalf, rangeOf, type HalfYear } from "@/lib/period/period";

async function findPeriod(companyId: string, h: HalfYear): Promise<Period | undefined> {
  const [row] = await db
    .select()
    .from(periodT)
    .where(and(eq(periodT.companyId, companyId), eq(periodT.year, h.year), eq(periodT.half, h.half)))
    .limit(1);
  return row;
}

/** 회차를 열거나(없으면 만들고 템플릿 항목을 복사) 기존 회차를 돌려준다. 여러 번 불러도 안전하다. */
export async function ensurePeriod(company: Company, h: HalfYear): Promise<Period> {
  const existing = await findPeriod(company.id, h);
  if (existing) return existing;

  const { start, end } = rangeOf(h);
  const templates = templatesFor(company.employeeBand as EmployeeBand);

  const created = await db.transaction(async (tx) => {
    // 동시에 두 요청이 같은 회차를 만들면 유일키 충돌 — 그때는 아무것도 하지 않는다.
    const [p] = await tx
      .insert(periodT)
      .values({ companyId: company.id, year: h.year, half: h.half, startDate: start, endDate: end })
      .onConflictDoNothing()
      .returning();
    if (!p) return null;
    await tx.insert(checkItemT).values(
      templates.map((t, i) => ({
        periodId: p.id,
        code: t.code,
        title: t.title,
        basis: t.basis,
        guide: t.guide,
        cadence: t.cadence,
        sortOrder: i,
      })),
    );
    return p;
  });
  if (created) return created;
  const again = await findPeriod(company.id, h);
  if (!again) throw new Error("회차를 만들지 못했습니다.");
  return again;
}

export async function ensureCurrentPeriod(company: Company): Promise<Period> {
  return ensurePeriod(company, currentHalf());
}

export interface Progress {
  total: number;
  done: number; // DONE + NA
  pending: number;
  issues: number; // PARTIAL + NOT_DONE
  percent: number;
}

export function progressOf(items: { status: string }[]): Progress {
  const total = items.length;
  const done = items.filter((i) => i.status === "DONE" || i.status === "NA").length;
  const issues = items.filter((i) => i.status === "PARTIAL" || i.status === "NOT_DONE").length;
  const pending = items.filter((i) => i.status === "PENDING").length;
  // 일부·미이행도 "점검은 한 것"이다. 진행률은 점검을 마친 비율로 본다.
  const checked = total - pending;
  return { total, done, pending, issues, percent: total === 0 ? 0 : Math.round((checked / total) * 100) };
}

/** 지난 회차에서 아직 안 끝난 개선 조치 — 이번 회차 화면에서 다시 보여준다. */
export async function openActionsFromPrevious(companyId: string, h: HalfYear) {
  const prev = previousHalf(h);
  return db
    .select({
      id: actionT.id,
      description: actionT.description,
      ownerName: actionT.ownerName,
      dueDate: actionT.dueDate,
      itemId: checkItemT.id,
      itemTitle: checkItemT.title,
    })
    .from(actionT)
    .innerJoin(checkItemT, eq(checkItemT.id, actionT.itemId))
    .innerJoin(periodT, eq(periodT.id, checkItemT.periodId))
    .where(and(eq(actionT.status, "OPEN"), eq(periodT.companyId, companyId), eq(periodT.year, prev.year), eq(periodT.half, prev.half)))
    .orderBy(asc(actionT.dueDate));
}

/** 회사 소유 확인을 포함한 조회 — 다른 회사의 id 를 넣어도 undefined. */
export async function getPeriodForCompany(companyId: string, periodId: string) {
  return db.query.period.findFirst({
    where: and(eq(periodT.id, periodId), eq(periodT.companyId, companyId)),
    with: {
      items: {
        orderBy: [asc(checkItemT.sortOrder)],
        with: {
          evidence: { orderBy: (e, { asc }) => [asc(e.createdAt)] },
          actions: { orderBy: (a, { asc }) => [asc(a.createdAt)] },
        },
      },
    },
  });
}

export async function getItemForCompany(companyId: string, itemId: string) {
  const item = await db.query.checkItem.findFirst({
    where: eq(checkItemT.id, itemId),
    with: {
      period: true,
      evidence: { orderBy: (e, { asc }) => [asc(e.createdAt)] },
      actions: { orderBy: (a, { asc }) => [asc(a.createdAt)] },
    },
  });
  if (!item || item.period.companyId !== companyId) return undefined;
  return item;
}

export async function logActivity(input: {
  companyId: string;
  periodId?: string | null;
  itemId?: string | null;
  actorEmail?: string | null;
  type: string;
  summary: string;
  detail?: unknown;
}): Promise<void> {
  await db.insert(activityT).values({
    companyId: input.companyId,
    periodId: input.periodId ?? null,
    itemId: input.itemId ?? null,
    actorEmail: input.actorEmail ?? null,
    type: input.type,
    summary: input.summary,
    detail: input.detail ?? null,
  });
}
