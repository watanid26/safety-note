import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { activity, db } from "@/lib/db";
import { requireMember } from "@/lib/auth/session";
import { getItemForCompany } from "@/lib/domain/periods";
import { STATUS_LABEL, templateByCode } from "@/lib/checklist/templates";
import { formatDate, formatDateTime, formatDay, halfLabel } from "@/lib/period/period";
import { eventLabel, lawChangeLink, listLawChanges } from "@/lib/laws/changes";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { StatusBadge } from "@/components/StatusBadge";
import { addAction, addEvidence, removeEvidence, toggleAction, updateItemStatus } from "@/app/app/actions";

export const metadata = { title: "점검 항목" };

const STATUS_OPTIONS = ["DONE", "PARTIAL", "NOT_DONE", "NA", "PENDING"] as const;
const STATUS_HELP: Record<string, string> = {
  DONE: "점검했고 문제가 없거나 이미 조치됨",
  PARTIAL: "일부만 되어 있어 추가 조치가 필요함",
  NOT_DONE: "점검 결과 지켜지지 않음 — 개선 조치를 등록하세요",
  NA: "우리 사업장에는 해당하지 않음 — 이유를 메모에 적어 주세요",
  PENDING: "아직 점검하지 않음",
};

export default async function ItemPage({ params }: { params: { id: string } }) {
  const { company, member } = await requireMember();
  const item = await getItemForCompany(company.id, params.id);
  if (!item) notFound();

  const template = templateByCode(item.code);
  const locked = item.period.status === "SIGNED";
  const canEdit = !locked && member.role !== "VIEWER";
  const h = { year: item.period.year, half: item.period.half as 1 | 2 };

  const [changes, activities] = await Promise.all([
    template ? listLawChanges({ since: item.period.startDate, titles: template.relatedLaws, limit: 10 }) : Promise.resolve([]),
    db.select().from(activity).where(and(eq(activity.companyId, company.id), eq(activity.itemId, item.id))).orderBy(desc(activity.createdAt)).limit(30),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/app/periods/${item.periodId}`} className="text-sm text-muted hover:text-ink">← {halfLabel(h)} 점검</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusBadge status={item.status} />
          <span className="text-sm text-muted">{item.basis}</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold">{item.title}</h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-7">{item.guide}</p>
        {template && template.evidenceHints.length > 0 && (
          <p className="mt-2 text-sm text-muted">증빙 예시: {template.evidenceHints.join(" · ")}</p>
        )}
        {locked && <p className="mt-3 rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">경영책임자 확인이 끝난 회차라 수정할 수 없습니다.</p>}
      </div>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">점검 결과</h2>
        {canEdit ? (
          <ActionForm action={updateItemStatus} className="mt-4 space-y-4">
            <input type="hidden" name="itemId" value={item.id} />
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">점검 결과</legend>
              {STATUS_OPTIONS.map((s) => (
                <label key={s} className="flex cursor-pointer items-start gap-2 rounded-md border border-line p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                  <input type="radio" name="status" value={s} defaultChecked={item.status === s} className="mt-1" />
                  <span>
                    <span className="block text-sm font-medium">{STATUS_LABEL[s]}</span>
                    <span className="block text-xs text-muted">{STATUS_HELP[s]}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div>
              <label className="label" htmlFor="note">점검 메모</label>
              <textarea id="note" name="note" rows={3} maxLength={2000} defaultValue={item.note ?? ""} className="input" placeholder="무엇을 어떻게 확인했는지 적어 두면 보고서에 그대로 들어갑니다." />
            </div>
            <SubmitButton>결과 저장</SubmitButton>
          </ActionForm>
        ) : (
          <div className="mt-3 text-sm">
            <p>{STATUS_LABEL[item.status]}{item.checkedBy ? ` · ${item.checkedBy} · ${formatDateTime(item.checkedAt)}` : ""}</p>
            {item.note && <p className="mt-2 whitespace-pre-wrap text-muted">{item.note}</p>}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">증빙 {item.evidence.length}건</h2>
        {item.evidence.length > 0 ? (
          <ul className="mt-3 divide-y divide-line text-sm">
            {item.evidence.map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="chip border border-line bg-bg text-muted">{ev.kind === "FILE" ? "파일" : ev.kind === "LINK" ? "링크" : "메모"}</span>
                {ev.kind === "FILE" ? (
                  <a href={`/api/evidence/${ev.id}`} className="link" target="_blank" rel="noreferrer">{ev.title}</a>
                ) : ev.kind === "LINK" ? (
                  <a href={ev.url ?? "#"} className="link" target="_blank" rel="noreferrer noopener">{ev.title}</a>
                ) : (
                  <span className="whitespace-pre-wrap">{ev.title}</span>
                )}
                <span className="text-xs text-muted">{ev.createdBy} · {formatDateTime(ev.createdAt)}</span>
                {canEdit && (
                  <form action={removeEvidence} className="ml-auto">
                    <input type="hidden" name="evidenceId" value={ev.id} />
                    <button className="btn-ghost px-2 py-1 text-xs">삭제</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">아직 증빙이 없습니다. 감독이나 수사 때 &ldquo;점검했다&rdquo;는 것을 보여줄 자료를 올려 두세요.</p>
        )}

        {canEdit && (
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <ActionForm action={addEvidence} resetOnSuccess className="rounded-md border border-line p-3">
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="kind" value="FILE" />
              <p className="mb-2 text-sm font-medium">파일 올리기</p>
              <input name="file" type="file" required className="block w-full text-sm" accept="image/*,application/pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" />
              <input name="title" maxLength={200} className="input mt-2" placeholder="설명 (비우면 파일명)" />
              <p className="mt-1 text-xs text-muted">10MB 이하 · 사진, PDF, 한글, 오피스 파일</p>
              <SubmitButton className="btn-secondary mt-2 w-full" pendingText="올리는 중…">올리기</SubmitButton>
            </ActionForm>
            <ActionForm action={addEvidence} resetOnSuccess className="rounded-md border border-line p-3">
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="kind" value="LINK" />
              <p className="mb-2 text-sm font-medium">링크 추가</p>
              <input name="title" required maxLength={200} className="input" placeholder="예: 그룹웨어 회의록" />
              <input name="url" type="url" required className="input mt-2" placeholder="https://" />
              <SubmitButton className="btn-secondary mt-2 w-full">추가</SubmitButton>
            </ActionForm>
            <ActionForm action={addEvidence} resetOnSuccess className="rounded-md border border-line p-3">
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="kind" value="NOTE" />
              <p className="mb-2 text-sm font-medium">메모로 남기기</p>
              <textarea name="title" required rows={3} maxLength={2000} className="input" placeholder="예: 9/12 현장 순회 점검, 지게차 통로 표시 보수함" />
              <SubmitButton className="btn-secondary mt-2 w-full">추가</SubmitButton>
            </ActionForm>
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">개선 조치</h2>
        <p className="text-sm text-muted">일부 이행·미이행이면 누가 언제까지 무엇을 할지 남겨 두세요. 끝나지 않은 조치는 다음 반기 화면에 다시 나타납니다.</p>
        {item.actions.length > 0 && (
          <ul className="mt-3 divide-y divide-line text-sm">
            {item.actions.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className={`chip ${a.status === "DONE" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>{a.status === "DONE" ? "완료" : "진행 중"}</span>
                <span className={a.status === "DONE" ? "text-muted line-through" : "font-medium"}>{a.description}</span>
                <span className="text-xs text-muted">{a.ownerName ?? "담당 미정"} · 기한 {formatDay(a.dueDate)}{a.doneAt ? ` · 완료 ${formatDay(a.doneAt)}` : ""}</span>
                {member.role !== "VIEWER" && (
                  <form action={toggleAction} className="ml-auto">
                    <input type="hidden" name="actionId" value={a.id} />
                    <button className="btn-ghost px-2 py-1 text-xs">{a.status === "DONE" ? "다시 열기" : "완료로 표시"}</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <ActionForm action={addAction} resetOnSuccess className="mt-4 grid gap-2 sm:grid-cols-[1fr_140px_150px_auto]">
            <input type="hidden" name="itemId" value={item.id} />
            <input name="description" required maxLength={500} className="input" placeholder="예: 2공장 안전교육 미이수자 12명 11월 중 교육" />
            <input name="ownerName" maxLength={40} className="input" placeholder="담당자" />
            <input name="dueDate" type="date" className="input" aria-label="기한" />
            <SubmitButton className="btn-secondary">등록</SubmitButton>
          </ActionForm>
        )}
      </section>

      {template && (
        <section className="card p-5">
          <h2 className="text-lg font-semibold">관련 법령 변경 (이번 반기)</h2>
          <p className="text-sm text-muted">{template.relatedLaws.join(" · ")}</p>
          {changes.length === 0 ? (
            <p className="mt-3 text-sm text-muted">이번 반기에 확인된 변경이 없습니다.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {changes.map((c) => {
                const href = lawChangeLink(c);
                return (
                  <li key={c.eventId} className="flex flex-wrap items-center gap-3 py-2">
                    <span className="chip bg-warn-soft text-warn">{eventLabel(c.eventType)}</span>
                    {href ? <a href={href} target="_blank" rel="noreferrer" className="link">{c.lawTitle}</a> : <span>{c.lawTitle}</span>}
                    <span className="text-xs text-muted">공포 {formatDate(c.promulgationDate)} · 시행 {formatDate(c.effectiveDate)} · 바뀐 조문 {c.changedCount}개</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">기록</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-muted">아직 기록이 없습니다.</p>
        ) : (
          <ul className="space-y-1 text-sm text-muted">
            {activities.map((a) => (
              <li key={a.id}>
                {formatDateTime(a.createdAt)} · {a.actorEmail ?? "시스템"} · {a.summary}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
