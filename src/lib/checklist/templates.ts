// 중대재해처벌법 시행령의 점검 의무를 "할 일" 목록으로 옮긴 템플릿.
//
// 원칙
//   - 조문 근거를 항목마다 붙인다. 회사가 감독관에게 "이 항목은 이 조문 때문에
//     점검했다"고 말할 수 있어야 한다.
//   - 설명은 쉬운 말로, 법률 해석이나 "이렇게 하면 면책된다"는 표현은 쓰지 않는다.
//   - 회차가 열릴 때 제목·근거·안내문을 DB에 스냅샷으로 복사한다. 이 파일을
//     고쳐도 이미 지난 회차의 기록은 바뀌지 않는다.
//
// 근거: 중대재해 처벌 등에 관한 법률 시행령 제4조·제5조·제13조
//       (최신 시행 2025-10-01, 대통령령 제35805호 기준으로 작성. 원문은 law.go.kr 에서 확인)

export type Cadence = "SEMIANNUAL" | "ANNUAL";

export type EmployeeBand = "UNDER_5" | "5_49" | "50_299" | "300_499" | "500_PLUS";

export interface ChecklistTemplate {
  code: string;
  title: string;
  basis: string;
  cadence: Cadence;
  /** 무엇을 확인하면 되는지 — 화면과 보고서에 그대로 나간다. */
  guide: string;
  /** 증빙으로 많이 쓰는 자료 예시. */
  evidenceHints: string[];
  /** 이 항목과 관련된 법령(법제처 법령명). 이 법령이 바뀌면 "다시 확인" 신호를 띄운다. */
  relatedLaws: string[];
  /** 이 조건일 때만 항목을 만든다. 없으면 모든 회사. */
  onlyFor?: EmployeeBand[];
}

export const LAW_SAPA = "중대재해 처벌 등에 관한 법률";
export const LAW_SAPA_DECREE = "중대재해 처벌 등에 관한 법률 시행령";
export const LAW_OSHA = "산업안전보건법";
export const LAW_OSHA_DECREE = "산업안전보건법 시행령";
export const LAW_OSHA_RULE = "산업안전보건법 시행규칙";
export const LAW_OSHA_STANDARD = "산업안전보건기준에 관한 규칙";

const SAPA = [LAW_SAPA, LAW_SAPA_DECREE];
const OSHA_ALL = [LAW_OSHA, LAW_OSHA_DECREE, LAW_OSHA_RULE, LAW_OSHA_STANDARD];

/** 관련 법령으로 추적하는 전체 목록 (중복 제거). */
export const TRACKED_LAWS: string[] = [...SAPA, ...OSHA_ALL];

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  // ── 반기 1회 이상 점검 (7개) ─────────────────────────────────────
  {
    code: "D4_3",
    title: "유해·위험요인 확인과 개선이 제대로 되고 있는지 점검",
    basis: "시행령 제4조 제3호",
    cadence: "SEMIANNUAL",
    guide:
      "사업장의 위험한 작업·장소·물질을 찾고 고치는 절차가 있는지, 그 절차대로 실제로 찾고 고쳤는지 확인합니다. 위험성평가를 하고 있다면 그 결과와 개선 내역을 확인하면 됩니다.",
    evidenceHints: ["위험성평가 결과표", "개선 전·후 사진", "아차사고 신고 기록"],
    relatedLaws: [...SAPA, LAW_OSHA, LAW_OSHA_RULE],
  },
  {
    code: "D4_5",
    title: "안전보건관리책임자 등이 업무를 잘 하고 있는지 평가",
    basis: "시행령 제4조 제5호",
    cadence: "SEMIANNUAL",
    guide:
      "안전보건관리책임자·관리감독자 등에게 필요한 권한과 예산을 줬는지, 미리 정한 평가 기준으로 업무 수행을 평가했는지 확인합니다.",
    evidenceHints: ["평가 기준표", "반기 평가 결과", "권한·예산 부여 문서"],
    relatedLaws: [...SAPA, LAW_OSHA],
  },
  {
    code: "D4_7",
    title: "직원 의견을 듣고 필요한 조치를 했는지 점검",
    basis: "시행령 제4조 제7호",
    cadence: "SEMIANNUAL",
    guide:
      "현장 직원(하청 직원 포함)이 안전 의견을 낼 수 있는 방법이 있는지, 들어온 의견을 검토하고 조치했는지 확인합니다. 산업안전보건위원회나 협의체 회의로 대신할 수 있는 경우가 있습니다.",
    evidenceHints: ["의견 접수 대장", "회의록", "조치 결과 공지"],
    relatedLaws: [...SAPA, LAW_OSHA],
  },
  {
    code: "D4_8",
    title: "중대산업재해 대비 매뉴얼 점검",
    basis: "시행령 제4조 제8호",
    cadence: "SEMIANNUAL",
    guide:
      "사고가 나거나 날 위험이 있을 때 작업 중지·대피·구조·보고를 어떻게 할지 정한 매뉴얼이 있는지, 그 매뉴얼대로 움직일 수 있는지(훈련 등) 확인합니다.",
    evidenceHints: ["비상 대응 매뉴얼", "비상 훈련 사진·기록", "비상 연락망"],
    relatedLaws: SAPA,
  },
  {
    code: "D4_9",
    title: "도급·용역·위탁 업체 선정 기준과 관리 점검",
    basis: "시행령 제4조 제9호",
    cadence: "SEMIANNUAL",
    guide:
      "일을 맡기는 업체를 고를 때 안전 관리 능력을 평가하는 기준과 절차가 있는지, 그 기준대로 업체를 골랐는지 확인합니다. 하청을 주지 않는다면 '해당 없음'으로 표시하고 이유를 적습니다.",
    evidenceHints: ["수급인 평가 기준", "업체 평가표", "계약서의 안전 조항"],
    relatedLaws: [...SAPA, LAW_OSHA],
  },
  {
    code: "D5_1",
    title: "안전·보건 관계 법령을 지키고 있는지 점검",
    basis: "시행령 제5조 제2항 제1호",
    cadence: "SEMIANNUAL",
    guide:
      "우리 사업장에 적용되는 산업안전보건법 등 안전·보건 법령의 의무를 지키고 있는지 확인합니다. 지키지 않은 것이 있으면 인력 배치나 예산 편성 같은 필요한 조치를 정합니다. 기간 중 바뀐 관련 법령은 아래 '법령 변경'에서 확인할 수 있습니다.",
    evidenceHints: ["법령 의무 점검표", "외부 점검 결과(위탁 시)", "미이행 조치 계획"],
    relatedLaws: [...SAPA, ...OSHA_ALL],
  },
  {
    code: "D5_3",
    title: "법정 안전·보건 교육을 했는지 점검",
    basis: "시행령 제5조 제2항 제3호",
    cadence: "SEMIANNUAL",
    guide:
      "정기교육·채용 시 교육·특별교육 등 법으로 정해진 안전·보건 교육을 했는지 확인합니다. 하지 못한 교육이 있으면 바로 하도록 지시하고 필요한 예산을 잡습니다.",
    evidenceHints: ["교육 일지", "참석자 서명부", "교육 자료", "외부 교육 수료증"],
    relatedLaws: [...SAPA, LAW_OSHA, LAW_OSHA_RULE],
  },

  // ── 체계 확인 (연 1회 이상 점검 권장) ─────────────────────────────
  {
    code: "D4_1",
    title: "안전·보건 목표와 경영방침이 정해져 있는지 확인",
    basis: "시행령 제4조 제1호",
    cadence: "ANNUAL",
    guide:
      "회사의 안전·보건 목표와 경영방침이 문서로 정해져 있고 직원들에게 알렸는지 확인합니다.",
    evidenceHints: ["안전보건 경영방침 문서", "게시 사진", "공지 기록"],
    relatedLaws: SAPA,
  },
  {
    code: "D4_4",
    title: "안전·보건 예산을 편성하고 집행했는지 확인",
    basis: "시행령 제4조 제4호",
    cadence: "ANNUAL",
    guide:
      "위험요인 개선, 인력·시설·장비에 필요한 예산을 잡고 실제로 썼는지 확인합니다.",
    evidenceHints: ["안전보건 예산 편성표", "집행 내역"],
    relatedLaws: SAPA,
  },
  {
    code: "D4_6",
    title: "안전관리자·보건관리자 등을 법정 인원만큼 두었는지 확인",
    basis: "시행령 제4조 제6호",
    cadence: "ANNUAL",
    guide:
      "산업안전보건법에 따라 두어야 하는 안전관리자·보건관리자·안전보건관리담당자·산업보건의 등을 정해진 수 이상 두었는지 확인합니다. 위탁하고 있다면 위탁 계약을 확인합니다.",
    evidenceHints: ["선임 서류", "위탁 계약서", "선임 신고 기록"],
    relatedLaws: [...SAPA, LAW_OSHA, LAW_OSHA_DECREE],
  },
  {
    code: "D4_2",
    title: "안전·보건 전담 조직이 있는지 확인",
    basis: "시행령 제4조 제2호",
    cadence: "ANNUAL",
    guide:
      "상시근로자 500명 이상 등 대상 사업장은 안전·보건 업무를 총괄하는 전담 조직을 두어야 합니다.",
    evidenceHints: ["조직도", "전담 조직 구성 문서"],
    relatedLaws: SAPA,
    onlyFor: ["500_PLUS"],
  },
];

export function templatesFor(band: EmployeeBand): ChecklistTemplate[] {
  return CHECKLIST_TEMPLATES.filter((t) => !t.onlyFor || t.onlyFor.includes(band));
}

export function templateByCode(code: string): ChecklistTemplate | undefined {
  return CHECKLIST_TEMPLATES.find((t) => t.code === code);
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "아직 안 함",
  DONE: "이행",
  PARTIAL: "일부 이행",
  NOT_DONE: "미이행",
  NA: "해당 없음",
};

export const INDUSTRY_LABEL: Record<string, string> = {
  MANUFACTURING: "제조업",
  CONSTRUCTION: "건설업",
  LOGISTICS: "운수·물류·창고",
  SERVICE: "서비스업",
  OTHER: "기타",
};

export const EMPLOYEE_BAND_LABEL: Record<EmployeeBand, string> = {
  UNDER_5: "5명 미만",
  "5_49": "5~49명",
  "50_299": "50~299명",
  "300_499": "300~499명",
  "500_PLUS": "500명 이상",
};

/** 중대재해처벌법 적용 여부 안내 (상시근로자 5명 미만은 적용 제외). */
export function sapaApplies(band: EmployeeBand): boolean {
  return band !== "UNDER_5";
}
