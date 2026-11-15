import { eq } from "drizzle-orm";
import { db, lawAck } from "@/lib/db";
import { requireMember } from "@/lib/auth/session";
import { TRACKED_LAWS } from "@/lib/checklist/templates";
import { formatDate, formatDateTime } from "@/lib/period/period";
import { eventLabel, lawChangeLink, lawDataAvailable, listLawChanges } from "@/lib/laws/changes";
import { ackLawChange } from "@/app/app/actions";

export const metadata = { title: "법령 변경" };

export default async function LawsPage() {
  const { company, member } = await requireMember();
  const since = new Date(Date.now() - 365 * 86_400_000);
  const [ok, changes, acks] = await Promise.all([
    lawDataAvailable(),
    listLawChanges({ since, limit: 100 }),
    db.select().from(lawAck).where(eq(lawAck.companyId, company.id)),
  ]);
  const ackMap = new Map(acks.map((a) => [a.changeEventId, a]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">관련 법령 변경</h1>
        <p className="mt-1 text-sm text-muted">
          점검 항목과 관련된 법령이 바뀌면 여기에 나타납니다. 내용을 보고 해당 점검 항목에 반영했다면 &lsquo;확인함&rsquo;으로 표시하세요. 확인 기록은 보고서에 남습니다.
        </p>
        <p className="mt-2 text-xs text-muted">추적 중: {TRACKED_LAWS.join(" · ")}</p>
      </div>
      {!ok ? (
        <div className="card p-5 text-sm text-muted">법령 변경 데이터가 아직 연결되지 않았습니다. (LawChange 수집 데이터와 같은 데이터베이스를 쓰도록 설정하면 자동으로 나타납니다.)</div>
      ) : changes.length === 0 ? (
        <div className="card p-5 text-sm text-muted">최근 1년간 관련 법령 변경이 없습니다.</div>
      ) : (
        <ul className="card divide-y divide-line">
          {changes.map((c) => {
            const ack = ackMap.get(c.eventId);
            const href = lawChangeLink(c);
            return (
              <li key={c.eventId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                <span className={`chip ${ack ? "bg-bg text-muted border border-line" : "bg-warn-soft text-warn"}`}>{eventLabel(c.eventType)}</span>
                {href ? <a href={href} target="_blank" rel="noreferrer" className="font-medium link">{c.lawTitle}</a> : <span className="font-medium">{c.lawTitle}</span>}
                <span className="text-muted">공포 {formatDate(c.promulgationDate)} · 시행 {formatDate(c.effectiveDate)} · 바뀐 조문 {c.changedCount}개</span>
                <span className="ml-auto">
                  {ack ? (
                    <span className="text-xs text-muted">확인함 · {ack.ackedBy} · {formatDateTime(ack.createdAt)}</span>
                  ) : member.role !== "VIEWER" ? (
                    <form action={ackLawChange}>
                      <input type="hidden" name="eventId" value={c.eventId} />
                      <input type="hidden" name="title" value={`${c.lawTitle} ${eventLabel(c.eventType)}`} />
                      <button className="btn-secondary px-2 py-1 text-xs">확인함</button>
                    </form>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
