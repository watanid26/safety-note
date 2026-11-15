import "server-only";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { company as companyT, db, period as periodT, reminderLog } from "@/lib/db";
import { progressOf } from "@/lib/domain/periods";
import { daysUntil, formatDay, halfLabel, reminderKindFor, rangeOf, todayKst, type ReminderKind } from "@/lib/period/period";
import { siteUrl } from "@/lib/site-url";
import { sendEmail } from "./email-transport";

// 반기 마감 알림. 매일 한 번 실행된다(vercel.json cron).
// - 마감 30일 전, 7일 전, 1일 전, 마감 다음 날(지남) 에 보낸다.
// - 같은 회차·같은 종류·같은 사람에게는 한 번만 (reminder_log 유일키).
// - 점검 담당(관리자·점검 담당)에게 보내고, 7일 전부터는 경영책임자에게도 보낸다.
// - 발송 경로가 설정되지 않아 보류(HELD)된 알림은 다음 실행 때 다시 시도한다.

const SUBJECT: Record<ReminderKind, (label: string) => string> = {
  D30: (l) => `[점검노트] ${l} 점검 마감 30일 전입니다`,
  D7: (l) => `[점검노트] ${l} 점검 마감 7일 전입니다`,
  D1: (l) => `[점검노트] ${l} 점검 마감이 내일입니다`,
  OVERDUE: (l) => `[점검노트] ${l} 점검 마감이 지났습니다`,
};

export async function runReminders(now: Date = new Date()) {
  const today = todayKst(now);
  const from = new Date(today.getTime() - 2 * 86_400_000);
  const to = new Date(today.getTime() + 31 * 86_400_000);

  const rows = await db
    .select({ id: periodT.id })
    .from(periodT)
    .innerJoin(companyT, eq(companyT.id, periodT.companyId))
    .where(and(eq(periodT.status, "OPEN"), gte(periodT.endDate, from), lte(periodT.endDate, to)));
  const periods = rows.length
    ? await db.query.period.findMany({
        where: inArray(periodT.id, rows.map((r) => r.id)),
        with: { company: { with: { members: true } }, items: { columns: { status: true } } },
      })
    : [];

  const results: { periodId: string; kind: ReminderKind; to: string; status: string }[] = [];
  for (const period of periods) {
    const left = daysUntil(period.endDate, now);
    const kind = reminderKindFor(left);
    if (!kind) continue;

    const recipients = new Set<string>();
    for (const m of period.company.members) if (m.role !== "VIEWER") recipients.add(m.email);
    if (kind !== "D30" && period.company.ceoEmail) recipients.add(period.company.ceoEmail);

    const h = { year: period.year, half: period.half as 1 | 2 };
    const label = halfLabel(h);
    const prog = progressOf(period.items);
    const link = `${siteUrl()}/app/periods/${period.id}`;
    const html = `
      <div style="font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;font-size:15px;line-height:1.7;color:#1c1e21">
        <p><b>${escapeHtml(period.company.name)}</b> ${label} 중대재해처벌법 의무이행 점검 마감(${formatDay(rangeOf(h).end)})이
        ${left > 0 ? `<b>${left}일</b> 남았습니다.` : "지났습니다."}</p>
        <p>현재 진행: ${prog.percent}% (남은 항목 ${prog.pending}개, 일부·미이행 ${prog.issues}개)</p>
        <p><a href="${link}" style="color:#1d4ed8">점검 화면 열기</a></p>
        <p style="color:#777;font-size:12px">시행령 제4조·제5조는 해당 항목을 반기 1회 이상 점검하도록 정하고 있습니다. 이 메일은 점검노트에 등록된 회사 구성원에게 발송됩니다.</p>
      </div>`;

    for (const to of recipients) {
      const [existing] = await db
        .select()
        .from(reminderLog)
        .where(and(eq(reminderLog.periodId, period.id), eq(reminderLog.kind, kind), eq(reminderLog.sentTo, to)))
        .limit(1);
      if (existing && existing.status === "SENT") continue;
      const res = await sendEmail({ to, subject: SUBJECT[kind](label), html });
      const status = res.ok ? "SENT" : res.held ? "HELD" : "FAILED";
      await db
        .insert(reminderLog)
        .values({ periodId: period.id, kind, sentTo: to, status, error: res.error ?? null })
        .onConflictDoUpdate({
          target: [reminderLog.periodId, reminderLog.kind, reminderLog.sentTo],
          set: { status, error: res.error ?? null, sentAt: new Date() },
        });
      results.push({ periodId: period.id, kind, to, status });
    }
  }
  return { checked: periods.length, sent: results };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
