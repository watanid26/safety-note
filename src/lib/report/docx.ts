import "server-only";
import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { REPORT_DISCLAIMER, type ReportData } from "./build";

// 보고서를 Word(.docx)로. 회사 양식에 붙여 넣거나 결재 문서에 첨부하는 용도.
const FONT = "맑은 고딕";

function p(text: string, opts: { bold?: boolean; size?: number; color?: string; spacingAfter?: number } = {}) {
  return new Paragraph({
    spacing: { after: opts.spacingAfter ?? 80 },
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 20, color: opts.color, font: FONT })],
  });
}

function h(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) {
  return new Paragraph({ heading: level, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, bold: true, font: FONT, size: level === HeadingLevel.TITLE ? 32 : 24 })] });
}

function cell(text: string, bold = false, width?: number) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, bold, font: FONT, size: 18 })] })],
  });
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };

export async function reportToDocx(r: ReportData): Promise<Buffer> {
  const info: [string, string][] = [
    ["회사", r.companyName],
    ["사업장", r.siteName ?? "-"],
    ["업종 / 상시근로자", `${r.industry} / ${r.employees}`],
    ["경영책임자", r.ceoName ?? "-"],
    ["점검 기간", r.range],
    ["보고서 생성", r.generatedAt],
    ["보관 기한 (시행령 제13조)", `${r.retention}까지`],
    ["상태", r.signed ? `확인 완료 (${r.signedByName}, ${r.signedAt})` : "확인 전 (초안)"],
  ];

  const children: (Paragraph | Table)[] = [
    p("중대재해 처벌 등에 관한 법률 시행령 제4조·제5조 관련", { color: "666666", size: 18 }),
    new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 200 }, children: [new TextRun({ text: r.title, bold: true, size: 32, font: FONT })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders, rows: info.map(([k, v]) => new TableRow({ children: [cell(k, true, 30), cell(v, false, 70)] })) }),

    h("1. 점검 결과 요약"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders,
      rows: [
        new TableRow({ children: ["전체", "이행", "일부 이행", "미이행", "해당 없음", "미점검"].map((t) => cell(t, true)) }),
        new TableRow({ children: [r.summary.total, r.summary.done, r.summary.partial, r.summary.notDone, r.summary.na, r.summary.pending].map((n) => cell(String(n))) }),
      ],
    }),

    h("2. 항목별 점검 내용"),
  ];

  for (const it of r.items) {
    children.push(p(`${it.no}. ${it.title}`, { bold: true, size: 22, spacingAfter: 40 }));
    children.push(p(`${it.basis} · ${it.cadenceLabel}`, { color: "666666", size: 18 }));
    children.push(p(`결과: ${it.statusLabel}${it.checkedBy ? ` · 점검자 ${it.checkedBy} · ${it.checkedAt}` : ""}`));
    if (it.note) children.push(p(`메모: ${it.note}`));
    children.push(p(`증빙: ${it.evidence.length === 0 ? "없음" : it.evidence.map((e) => `[${e.kind}] ${e.title}`).join(" / ")}`));
    for (const a of it.actions) {
      children.push(p(`개선 조치: ${a.description} — ${a.owner}, 기한 ${a.due}, ${a.status}${a.status === "완료" ? ` (${a.doneAt})` : ""}`));
    }
    children.push(p("", { spacingAfter: 120 }));
  }

  children.push(h("3. 점검 기간 중 관련 법령 변경"));
  if (!r.lawDataConnected) children.push(p("법령 변경 데이터가 연결되어 있지 않습니다."));
  else if (r.lawChanges.length === 0) children.push(p("점검 기간 중 확인된 관련 법령 변경이 없습니다."));
  else
    for (const c of r.lawChanges) {
      const d = (x: Date | null) => (x ? new Date(x.getTime() + 9 * 3600_000).toISOString().slice(0, 10).replace(/-/g, ".") : "-");
      children.push(p(`${c.lawTitle} ${c.label} (공포 ${d(c.promulgationDate)}, 시행 ${d(c.effectiveDate)}) — ${c.acked ? "회사 확인함" : "확인 기록 없음"}`));
    }

  children.push(h("4. 경영책임자 확인"));
  if (r.signed) {
    children.push(p("위 점검 결과를 확인하였습니다."));
    children.push(p(`확인자: ${r.signedByName} · 확인 일시: ${r.signedAt}`, { bold: true }));
    if (r.signNote) children.push(p(`의견: ${r.signNote}`));
  } else {
    children.push(p("확인자:                              (서명)          확인 일시:"));
  }

  children.push(p(""));
  children.push(p(REPORT_DISCLAIMER, { color: "777777", size: 16 }));

  const doc = new Document({
    creator: "중대재해 점검노트",
    title: r.title,
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(doc);
}
