import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, lawAck } from "@/lib/db";
import { requireMember } from "@/lib/auth/session";
import { getPeriodForCompany, openActionsFromPrevious, progressOf } from "@/lib/domain/periods";
import { daysUntil, formatDay, halfLabel } from "@/lib/period/period";
import { templateByCode } from "@/lib/checklist/templates";
import { lawDataAvailable, listLawChanges } from "@/lib/laws/changes";
import { DueBadge, StatusBadge } from "@/components/StatusBadge";
import { toggleAction } from "@/app/app/actions";

export const metadata = { title: "반기 점검" };

export default async function PeriodPage({ params }: { params: { id: string } }) {
  const { company } = await requireMember();
  const period = await getPeriodForCompany(company.id, params.id);
  if (!period) notFound();

  const h = { year: period.year, half: period.half as 1 | 2 };
  const signed = period.status === "SIGNED";
  const left = daysUntil(period.endDate);
  const progress = progressOf(period.items);

  const [carried, lawOk, changes, acks] = await Promise.all([
    openActionsFromPrevious(company.id, h),
    lawDataAvailable(),
    listLawChanges({ since: period.startDate }),
    db.select({ changeEventId: lawAck.changeEventId }).from(lawAck).where(eq(lawAck.companyId, company.id)),
  ]);
  const acked = new Set(acks.map((a) => a.changeEventId));
  const unackedChanges = changes.filter((c) => !acked.has(c.eventId));

  const semi = period.items.filter((i) => i.cadence === "SEMIANNUAL");
  const annual = period.items.filter((i) => i.cadence === "ANNUAL");

  function lawFlag(code: string): number {
    const t = templateByCode(code);
    if (!t) return 0;
    return unackedChanges.filter((c) => t.relatedLaws.includes(c.lawTitle)).length;
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">중대재해처벌법 반기 의무이행 점검</p>
          <h1 className="mt-1 text-2xl font-semibold">{halfLabel(h)} 점검</h1>
          <p className="mt-1 text-sm text-muted">
            점검 기간 {formatDay(period.startDate)} ~ {formatDay(period.endDate)} <DueBadge daysLeft={left} signed={signed} />
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/app/periods/${period.id}/report`} className="btn-primary">보고서 보기</Link>
        </div>
      </section>

      {signed && (
        <div className="rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">
          {period.signedByName} 님이 {formatDay(period.signedAt)}에 확인했습니다. 이 회차의 기록은 잠겨 있고 5년간 보관됩니다.
        </div>
      )}

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            <b className="text-lg">{progress.percent}%</b> <span className="text-muted">점검 완료 ({progress.total - progress.pending}/{progress.total})</span>
          </span>
          <span className="text-muted">
            이행·해당없음 {progress.done} · 일부·미이행 {progress.issues} · 남음 {progress.pending}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg">
          <div className="h-full rounded-full bg-brand" style={{ width: `${progress.percent}%` }} />
        </div>
        {!signed && progress.pending === 0 && (
          <p className="mt-3 text-sm">
            모든 항목을 점검했습니다. <Link href={`/app/periods/${period.id}/report`} className="link">보고서에서 경영책임자 확인</Link>을 받으세요.
          </p>
        )}
      </section>

      {lawOk && unackedChanges.length > 0 && (
        <section className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn">
          이번 반기에 관련 법령 변경이 <b>{unackedChanges.length}건</b> 있습니다. 해당 점검 항목을 다시 확인해 주세요.{" "}
          <Link href="/app/laws" className="underline">변경 내용 보기</Link>
        </section>
      )}

      {carried.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">지난 반기에서 넘어온 개선 조치</h2>
          <ul className="card divide-y divide-line">
            {carried.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <form action={toggleAction}>
                  <input type="hidden" name="actionId" value={a.id} />
                  <button className="btn-secondary px-2 py-1 text-xs">완료로 표시</button>
                </form>
                <span className="font-medium">{a.description}</span>
                <span className="text-muted">
                  {a.itemTitle} · {a.ownerName ?? "담당 미정"} · 기한 {formatDay(a.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ItemGroup title="반기 1회 이상 점검" note="시행령 제4조·제5조에서 반기마다 점검하라고 정한 항목입니다." items={semi} lawFlag={lawFlag} />
      <ItemGroup title="안전보건 체계 확인" note="반기 점검 의무는 아니지만 체계가 갖춰져 있는지 함께 확인해 두면 좋은 항목입니다." items={annual} lawFlag={lawFlag} />
    </div>
  );
}

function ItemGroup({
  title,
  note,
  items,
  lawFlag,
}: {
  title: string;
  note: string;
  items: { id: string; code: string; title: string; basis: string; status: string; evidence: unknown[]; actions: { status: string }[] }[];
  lawFlag: (code: string) => number;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-3 text-sm text-muted">{note}</p>
      <ul className="card divide-y divide-line">
        {items.map((it) => {
          const openActions = it.actions.filter((a) => a.status === "OPEN").length;
          const flags = lawFlag(it.code);
          return (
            <li key={it.id}>
              <Link href={`/app/items/${it.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-bg">
                <StatusBadge status={it.status} />
                <span className="font-medium">{it.title}</span>
                <span className="text-xs text-muted">{it.basis}</span>
                <span className="ml-auto flex gap-2 text-xs text-muted">
                  {flags > 0 && <span className="chip bg-warn-soft text-warn">법령 변경 {flags}</span>}
                  <span>증빙 {it.evidence.length}</span>
                  {openActions > 0 && <span className="text-warn">조치 {openActions}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
