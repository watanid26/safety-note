import "server-only";
import ExcelJS from "exceljs";
import { CHECKLIST_TEMPLATES } from "./templates";
import { siteUrl } from "@/lib/site-url";

// 무료 배포용 "중대재해처벌법 반기 의무이행 점검표" 엑셀.
// 서비스를 몰라도 이 파일만으로 점검을 할 수 있어야 한다 — 그래야 검색으로 들어온
// 담당자가 받아 가고, 매번 엑셀로 하기 번거로울 때 서비스로 넘어온다.
export async function buildFreeChecklist(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "중대재해 점검노트";
  wb.created = new Date();

  const ws = wb.addWorksheet("반기 점검표", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: "frozen", ySplit: 6 }],
  });

  ws.mergeCells("A1:M1");
  ws.getCell("A1").value = "중대재해처벌법 반기 의무이행 점검표";
  ws.getCell("A1").font = { size: 16, bold: true };
  ws.mergeCells("A2:M2");
  ws.getCell("A2").value = "근거: 중대재해 처벌 등에 관한 법률 시행령 제4조·제5조 (반기 1회 이상 점검), 제13조 (이행 기록 5년 보관)";
  ws.getCell("A2").font = { size: 10, color: { argb: "FF666666" } };

  const info: [string, string][] = [
    ["A4", "회사명"], ["C4", ""], ["E4", "사업장"], ["G4", ""], ["I4", "점검 기간"], ["K4", "20__년 상·하반기"],
    ["A5", "점검 담당"], ["C5", ""], ["E5", "경영책임자"], ["G5", ""], ["I5", "확인일"], ["K5", ""],
  ];
  for (const [addr, val] of info) {
    const c = ws.getCell(addr);
    c.value = val;
    if (["A", "E", "I"].includes(addr[0])) c.font = { bold: true };
  }
  ["A4:B4", "C4:D4", "E4:F4", "G4:H4", "I4:J4", "K4:M4", "A5:B5", "C5:D5", "E5:F5", "G5:H5", "I5:J5", "K5:M5"].forEach((r) => ws.mergeCells(r));

  const header = ["번호", "구분", "점검 항목", "근거", "무엇을 확인하나", "증빙 예시", "결과", "점검일", "점검자", "메모", "개선 조치", "담당", "기한"];
  const headerRow = ws.getRow(6);
  header.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  headerRow.height = 22;

  const widths = [6, 10, 30, 16, 50, 26, 10, 11, 10, 26, 26, 10, 11];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  const rows = CHECKLIST_TEMPLATES.filter((t) => !t.onlyFor);
  rows.forEach((t, i) => {
    const r = ws.getRow(7 + i);
    r.values = [i + 1, t.cadence === "SEMIANNUAL" ? "반기 점검" : "체계 확인", t.title, t.basis, t.guide, t.evidenceHints.join(", "), "", "", "", "", "", "", ""];
    r.alignment = { vertical: "top", wrapText: true };
    r.height = 75;
    ws.getCell(`G${7 + i}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"이행,일부 이행,미이행,해당 없음"'],
    };
  });

  const last = 6 + rows.length;
  for (let r = 6; r <= last; r++) {
    for (let c = 1; c <= header.length; c++) {
      ws.getRow(r).getCell(c).border = {
        top: { style: "thin", color: { argb: "FFBBBBBB" } },
        bottom: { style: "thin", color: { argb: "FFBBBBBB" } },
        left: { style: "thin", color: { argb: "FFBBBBBB" } },
        right: { style: "thin", color: { argb: "FFBBBBBB" } },
      };
    }
  }

  const note = last + 2;
  ws.mergeCells(`A${note}:M${note}`);
  ws.getCell(`A${note}`).value =
    "※ 이 점검표는 시행령 조문을 쉬운 말로 정리한 참고 양식이며 법률 자문이 아닙니다. 업종·규모에 따라 추가로 확인할 의무가 있을 수 있습니다. 점검 결과와 증빙은 5년간 보관하세요.";
  ws.getCell(`A${note}`).font = { size: 9, color: { argb: "FF777777" } };
  ws.mergeCells(`A${note + 1}:M${note + 1}`);
  ws.getCell(`A${note + 1}`).value = {
    text: `매 반기 알림, 증빙 보관, 보고서 자동 작성은 중대재해 점검노트에서 → ${siteUrl()}`,
    hyperlink: siteUrl(),
  };
  ws.getCell(`A${note + 1}`).font = { size: 10, color: { argb: "FF1D4ED8" }, underline: true };

  const guide = wb.addWorksheet("사용 방법");
  guide.getColumn(1).width = 110;
  [
    "사용 방법",
    "1. 상반기(1~6월), 하반기(7~12월)마다 한 번씩 이 표를 새로 만들어 점검합니다.",
    "2. 항목마다 '무엇을 확인하나'를 보고 실제로 확인한 뒤 결과를 고릅니다 (이행 / 일부 이행 / 미이행 / 해당 없음).",
    "3. '해당 없음'은 이유를 메모에 꼭 적습니다. (예: 하청을 주지 않음)",
    "4. 일부 이행·미이행이면 개선 조치, 담당, 기한을 적고 조치가 끝나면 날짜를 남깁니다.",
    "5. 교육 일지, 회의록, 사진 같은 증빙은 회차별 폴더에 모아 둡니다.",
    "6. 경영책임자에게 결과를 보고하고 확인(서명)을 받은 뒤 5년간 보관합니다.",
    "",
    "반기 점검 항목 (시행령 기준)",
    ...CHECKLIST_TEMPLATES.filter((t) => t.cadence === "SEMIANNUAL").map((t) => `· ${t.title} — ${t.basis}`),
    "",
    "법령 원문: 국가법령정보센터(law.go.kr)에서 '중대재해 처벌 등에 관한 법률 시행령'을 검색하세요.",
  ].forEach((line, i) => {
    const c = guide.getCell(`A${i + 1}`);
    c.value = line;
    c.alignment = { wrapText: true };
    if (i === 0 || line === "반기 점검 항목 (시행령 기준)") c.font = { bold: true, size: 13 };
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
