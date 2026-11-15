import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, period as periodT } from "@/lib/db";
import { requireMember } from "@/lib/auth/session";
import { progressOf } from "@/lib/domain/periods";
import { currentHalf, formatDay, halfLabel, previousHalf, retentionUntil } from "@/lib/period/period";
import { openPeriod } from "@/app/app/actions";

export const metadata = { title: "보관함" };

export default async function ArchivePage() {
  const { company, member } = await requireMember();
  const periods = await db.query.period.findMany({
    where: eq(periodT.companyId, company.id),
    orderBy: [desc(periodT.year), desc(periodT.half)],
    with: { items: { columns: { status: true } } },
  });
  const prev = previousHalf(currentHalf());
  const hasPrev = periods.some((p) => p.year === prev.year && p.half === prev.half);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">보관함</h1>
        <p className="mt-1 text-sm text-muted">
          시행령 제13조에 따라 점검·조치 기록은 이행한 날부터 5년간 서면(전자문서 포함)으로 보관해야 합니다. 모든 회차가 여기 남습니다.
        </p>
      </div>
      <ul className="card divide-y divide-line">
        {periods.map((p) => {
          const h = { year: p.year, half: p.half as 1 | 2 };
          const prog = progressOf(p.items);
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <Link href={`/app/periods/${p.id}`} className="font-medium link">{halfLabel(h)}</Link>
              <span className={`chip ${p.status === "SIGNED" ? "bg-ok-soft text-ok" : "border border-line bg-bg text-muted"}`}>
                {p.status === "SIGNED" ? `확인 완료 · ${p.signedByName}` : `진행 ${prog.percent}%`}
              </span>
              <span className="text-muted">보관 기한 {formatDay(retentionUntil(p.endDate))}</span>
              <Link href={`/app/periods/${p.id}/report`} className="ml-auto link">보고서</Link>
            </li>
          );
        })}
      </ul>
      {!hasPrev && member.role !== "VIEWER" && (
        <form action={openPeriod} className="card flex flex-wrap items-center gap-3 p-4 text-sm">
          <input type="hidden" name="year" value={prev.year} />
          <input type="hidden" name="half" value={prev.half} />
          <span>{halfLabel(prev)} 점검 기록도 남겨 두시겠어요? 이미 한 점검을 늦게라도 기록할 수 있습니다.</span>
          <button className="btn-secondary ml-auto">{halfLabel(prev)} 열기</button>
        </form>
      )}
    </div>
  );
}
