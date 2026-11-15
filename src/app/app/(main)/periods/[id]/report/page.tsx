import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { buildReport, REPORT_DISCLAIMER } from "@/lib/report/build";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { signPeriod } from "@/app/app/actions";
import { PrintButton } from "./PrintButton";
import { formatDate } from "@/lib/period/period";

export const metadata = { title: "점검 보고서" };

export default async function ReportPage({ params }: { params: { id: string } }) {
  const { company, member, user } = await requireMember();
  const r = await buildReport(company, params.id);
  if (!r) notFound();
  const canSign = !r.signed && (member.role === "OWNER" || (!!company.ceoEmail && company.ceoEmail === user.email));

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Link href={`/app/periods/${r.periodId}`} className="btn-ghost">← 점검 화면</Link>
        <div className="ml-auto flex gap-2">
          <PrintButton />
          <a href={`/api/periods/${r.periodId}/report`} className="btn-secondary">Word 파일 받기</a>
        </div>
      </div>

      {!r.signed && (
        <p className="no-print rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          아직 경영책임자 확인 전인 초안입니다. 모든 항목을 점검한 뒤 아래에서 확인을 받으세요.
        </p>
      )}

      <article className="card space-y-8 p-6 sm:p-10">
        <header className="space-y-2 border-b border-line pb-6">
          <p className="text-sm text-muted">중대재해 처벌 등에 관한 법률 시행령 제4조·제5조 관련</p>
          <h1 className="text-2xl font-semibold">{r.title}</h1>
          <dl className="grid gap-x-8 gap-y-1 pt-2 text-sm sm:grid-cols-2">
            <Row k="회사" v={r.companyName} />
            <Row k="사업장" v={r.siteName ?? "-"} />
            <Row k="업종 / 상시근로자" v={`${r.industry} / ${r.employees}`} />
            <Row k="경영책임자" v={r.ceoName ?? "-"} />
            <Row k="점검 기간" v={r.range} />
            <Row k="보고서 생성" v={r.generatedAt} />
            <Row k="보관 기한 (시행령 제13조)" v={`${r.retention}까지`} />
            <Row k="상태" v={r.signed ? `확인 완료 (${r.signedByName}, ${r.signedAt})` : "확인 전 (초안)"} />
          </dl>
        </header>

        <section>
          <h2 className="mb-3 text-lg font-semibold">1. 점검 결과 요약</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 font-medium">전체</th><th className="font-medium">이행</th><th className="font-medium">일부 이행</th><th className="font-medium">미이행</th><th className="font-medium">해당 없음</th><th className="font-medium">미점검</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-base">
                <td className="py-2">{r.summary.total}</td><td>{r.summary.done}</td><td>{r.summary.partial}</td><td>{r.summary.notDone}</td><td>{r.summary.na}</td><td>{r.summary.pending}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">2. 항목별 점검 내용</h2>
          <div className="space-y-5">
            {r.items.map((it) => (
              <div key={it.no} className="break-inside-avoid rounded-md border border-line p-4">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-sm text-muted">{it.no}.</span>
                  <h3 className="font-semibold">{it.title}</h3>
                </div>
                <p className="mt-1 text-xs text-muted">{it.basis} · {it.cadenceLabel}</p>
                <p className="mt-2 text-sm"><b>결과</b> {it.statusLabel}{it.checkedBy ? ` · 점검자 ${it.checkedBy} · ${it.checkedAt}` : ""}</p>
                {it.note && <p className="mt-1 whitespace-pre-wrap text-sm"><b>메모</b> {it.note}</p>}
                <p className="mt-1 text-sm"><b>증빙</b> {it.evidence.length === 0 ? "없음" : it.evidence.map((e) => `[${e.kind}] ${e.title}`).join(" / ")}</p>
                {it.actions.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-sm">
                    {it.actions.map((a, i) => (
                      <li key={i}>개선 조치: {a.description} — {a.owner}, 기한 {a.due}, {a.status}{a.status === "완료" ? ` (${a.doneAt})` : ""}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">3. 점검 기간 중 관련 법령 변경</h2>
          {!r.lawDataConnected ? (
            <p className="text-sm text-muted">법령 변경 데이터가 연결되어 있지 않습니다.</p>
          ) : r.lawChanges.length === 0 ? (
            <p className="text-sm text-muted">점검 기간 중 확인된 관련 법령 변경이 없습니다.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {r.lawChanges.map((c) => (
                <li key={c.eventId}>
                  {c.lawTitle} {c.label} (공포 {fmt(c.promulgationDate)}, 시행 {fmt(c.effectiveDate)}) — {c.acked ? "회사 확인함" : "확인 기록 없음"}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="break-inside-avoid">
          <h2 className="mb-3 text-lg font-semibold">4. 경영책임자 확인</h2>
          {r.signed ? (
            <div className="rounded-md border border-line p-4 text-sm">
              <p>위 점검 결과를 확인하였습니다.</p>
              <p className="mt-2">확인자: <b>{r.signedByName}</b> · 확인 일시: {r.signedAt}</p>
              {r.signNote && <p className="mt-2 whitespace-pre-wrap">의견: {r.signNote}</p>}
            </div>
          ) : canSign ? (
            <ActionForm action={signPeriod} className="no-print space-y-3 rounded-md border border-line p-4">
              <input type="hidden" name="periodId" value={r.periodId} />
              <div>
                <label className="label" htmlFor="signedByName">확인자 이름</label>
                <input id="signedByName" name="signedByName" required maxLength={40} defaultValue={company.ceoName ?? ""} className="input max-w-xs" />
              </div>
              <div>
                <label className="label" htmlFor="signNote">의견 (필요한 조치 지시 등)</label>
                <textarea id="signNote" name="signNote" rows={3} maxLength={1000} className="input" placeholder="예: 미이수 교육은 11월까지 완료하고 예산은 안전팀 예비비에서 집행할 것" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="confirm" /> 위 점검 결과를 확인했습니다. 확인 후에는 이 회차를 수정할 수 없습니다.
              </label>
              <SubmitButton pendingText="기록 중…">확인 기록하기</SubmitButton>
            </ActionForm>
          ) : (
            <p className="text-sm text-muted">회사 관리자 또는 경영책임자로 등록된 이메일로 로그인하면 확인할 수 있습니다.</p>
          )}
        </section>

        <footer className="border-t border-line pt-4 text-xs text-muted">{REPORT_DISCLAIMER}</footer>
      </article>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-40 shrink-0 text-muted">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function fmt(d: Date | null) {
  return formatDate(d);
}
