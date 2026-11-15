import "server-only";
import { eq } from "drizzle-orm";
import { db, lawAck, type Company } from "@/lib/db";
import { getPeriodForCompany } from "@/lib/domain/periods";
import { EMPLOYEE_BAND_LABEL, INDUSTRY_LABEL, STATUS_LABEL, type EmployeeBand } from "@/lib/checklist/templates";
import { formatDateTime, formatDay, halfLabel, retentionUntil } from "@/lib/period/period";
import { eventLabel, lawDataAvailable, listLawChanges, type LawChange } from "@/lib/laws/changes";

// 보고서 데이터 — 화면(인쇄)과 Word 파일이 같은 데이터를 쓴다.

export interface ReportItem {
  no: number;
  title: string;
  basis: string;
  cadenceLabel: string;
  status: string;
  statusLabel: string;
  checkedBy: string | null;
  checkedAt: string;
  note: string | null;
  evidence: { kind: string; title: string }[];
  actions: { description: string; owner: string; due: string; status: string; doneAt: string }[];
}

export interface ReportData {
  periodId: string;
  title: string;
  companyName: string;
  siteName: string | null;
  industry: string;
  employees: string;
  ceoName: string | null;
  range: string;
  generatedAt: string;
  retention: string;
  signed: boolean;
  signedByName: string | null;
  signedAt: string;
  signNote: string | null;
  summary: { total: number; done: number; partial: number; notDone: number; na: number; pending: number };
  items: ReportItem[];
  lawChanges: (LawChange & { label: string; acked: boolean })[];
  lawDataConnected: boolean;
}

export async function buildReport(company: Company, periodId: string): Promise<ReportData | null> {
  const period = await getPeriodForCompany(company.id, periodId);
  if (!period) return null;
  const h = { year: period.year, half: period.half as 1 | 2 };

  const [changes, acks, lawOk] = await Promise.all([
    listLawChanges({ since: period.startDate }),
    db.select({ changeEventId: lawAck.changeEventId }).from(lawAck).where(eq(lawAck.companyId, company.id)),
    lawDataAvailable(),
  ]);
  const acked = new Set(acks.map((a) => a.changeEventId));
  const end = new Date(period.endDate.getTime() + 86_400_000);
  const inPeriod = changes.filter((c) => (c.promulgationDate ?? c.detectedAt) < end);

  const items: ReportItem[] = period.items.map((it, i) => ({
    no: i + 1,
    title: it.title,
    basis: it.basis,
    cadenceLabel: it.cadence === "SEMIANNUAL" ? "반기 점검" : "체계 확인",
    status: it.status,
    statusLabel: STATUS_LABEL[it.status] ?? it.status,
    checkedBy: it.checkedBy,
    checkedAt: formatDateTime(it.checkedAt),
    note: it.note,
    evidence: it.evidence.map((e) => ({ kind: e.kind === "FILE" ? "파일" : e.kind === "LINK" ? "링크" : "메모", title: e.kind === "FILE" ? `${e.title}${e.fileName && e.fileName !== e.title ? ` (${e.fileName})` : ""}` : e.title })),
    actions: it.actions.map((a) => ({
      description: a.description,
      owner: a.ownerName ?? "담당 미정",
      due: formatDay(a.dueDate),
      status: a.status === "DONE" ? "완료" : "진행 중",
      doneAt: formatDay(a.doneAt),
    })),
  }));

  const count = (s: string) => period.items.filter((i) => i.status === s).length;

  return {
    periodId: period.id,
    title: `${halfLabel(h)} 안전·보건 의무이행 점검 보고서`,
    companyName: company.name,
    siteName: company.siteName,
    industry: INDUSTRY_LABEL[company.industry] ?? company.industry,
    employees: EMPLOYEE_BAND_LABEL[company.employeeBand as EmployeeBand] ?? company.employeeBand,
    ceoName: company.ceoName,
    range: `${formatDay(period.startDate)} ~ ${formatDay(period.endDate)}`,
    generatedAt: formatDateTime(new Date()),
    retention: formatDay(retentionUntil(period.endDate)),
    signed: period.status === "SIGNED",
    signedByName: period.signedByName,
    signedAt: formatDateTime(period.signedAt),
    signNote: period.signNote,
    summary: {
      total: period.items.length,
      done: count("DONE"),
      partial: count("PARTIAL"),
      notDone: count("NOT_DONE"),
      na: count("NA"),
      pending: count("PENDING"),
    },
    items,
    lawChanges: inPeriod.map((c) => ({ ...c, label: eventLabel(c.eventType), acked: acked.has(c.eventId) })),
    lawDataConnected: lawOk,
  };
}

export const REPORT_DISCLAIMER =
  "이 보고서는 회사가 입력한 점검 기록을 정리한 것입니다. 법률 자문이나 법령 준수 여부에 대한 판단이 아니며, 구체적인 법적 판단은 전문가와 상의하시기 바랍니다.";
