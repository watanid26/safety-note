import { STATUS_LABEL } from "@/lib/checklist/templates";

const STYLE: Record<string, string> = {
  PENDING: "bg-bg text-muted border border-line",
  DONE: "bg-ok-soft text-ok",
  NA: "bg-bg text-muted border border-line",
  PARTIAL: "bg-warn-soft text-warn",
  NOT_DONE: "bg-bad-soft text-bad",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`chip ${STYLE[status] ?? STYLE.PENDING}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function DueBadge({ daysLeft, signed }: { daysLeft: number; signed: boolean }) {
  if (signed) return <span className="chip bg-ok-soft text-ok">확인 완료</span>;
  if (daysLeft < 0) return <span className="chip bg-bad-soft text-bad">마감 {-daysLeft}일 지남</span>;
  if (daysLeft === 0) return <span className="chip bg-bad-soft text-bad">오늘 마감</span>;
  if (daysLeft <= 30) return <span className="chip bg-warn-soft text-warn">마감 D-{daysLeft}</span>;
  return <span className="chip bg-bg text-muted border border-line">마감 D-{daysLeft}</span>;
}
