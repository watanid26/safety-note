import "server-only";
import { sql } from "@/lib/db";
import { TRACKED_LAWS } from "@/lib/checklist/templates";

// LawChange 가 매일 수집하는 법령 변경 데이터를 "읽기만" 한다.
//
// - 같은 Postgres 의 LAW_DATA_SCHEMA(기본 public) 스키마에 있는
//   legal_document / legal_change_event 테이블을 SELECT 로만 조회한다.
// - 이 프로젝트는 그 테이블을 만들지도, 고치지도 않는다.
// - 테이블이 없으면(LawChange 와 다른 DB 를 쓰는 경우 등) 빈 목록을 돌려주고
//   화면은 "법령 데이터 연결 안 됨" 으로 안내한다. 점검 기능은 그대로 동작한다.

export interface LawChange {
  eventId: string;
  documentId: string;
  externalDocumentId: string;
  lawTitle: string;
  eventType: string;
  promulgationDate: Date | null;
  effectiveDate: Date | null;
  detectedAt: Date;
  changedCount: number;
  officialUrl: string | null;
}

const EVENT_LABEL: Record<string, string> = {
  FIRST_ISSUE: "제정",
  REVISION: "개정",
  REPEAL: "폐지",
  CORRECTION: "정정",
  TITLE_CHANGE: "제명 변경",
};

export function eventLabel(t: string): string {
  return EVENT_LABEL[t] ?? t;
}

function lawSchema(): string {
  const s = process.env.LAW_DATA_SCHEMA ?? "public";
  // 식별자로 바로 들어가므로 영문·숫자·밑줄만 허용.
  if (!/^[a-z_][a-z0-9_]*$/i.test(s)) throw new Error("LAW_DATA_SCHEMA 값이 올바르지 않습니다.");
  return s;
}

let availability: { checkedAt: number; ok: boolean } | null = null;

export async function lawDataAvailable(): Promise<boolean> {
  if (availability && Date.now() - availability.checkedAt < 10 * 60_000) return availability.ok;
  const schema = lawSchema();
  try {
    const rows = await sql.unsafe<{ ok: boolean }[]>(
      `SELECT to_regclass('${schema}.legal_change_event') IS NOT NULL AND to_regclass('${schema}.legal_document') IS NOT NULL AS ok`,
    );
    availability = { checkedAt: Date.now(), ok: Boolean(rows[0]?.ok) };
  } catch {
    availability = { checkedAt: Date.now(), ok: false };
  }
  return availability.ok;
}

/**
 * 추적 법령의 변경 목록 (since 이후 공포·발령·감지된 것).
 * titles 를 주면 그 법령만, 안 주면 점검표 전체가 추적하는 법령.
 */
export async function listLawChanges(params: { since: Date; titles?: string[]; limit?: number }): Promise<LawChange[]> {
  if (!(await lawDataAvailable())) return [];
  const schema = lawSchema();
  const titles = params.titles ?? TRACKED_LAWS;
  const limit = Math.min(params.limit ?? 50, 200);
  const rows = await sql.unsafe<
    {
      event_id: string;
      document_id: string;
      external_document_id: string;
      law_title: string;
      event_type: string;
      promulgation_date: Date | string | null;
      effective_date: Date | string | null;
      detected_at: Date | string;
      changed_count: number;
      official_url: string | null;
    }[]
  >(
    `SELECT e.id AS event_id, d.id AS document_id, d.external_document_id, d.current_title AS law_title,
            e.event_type, e.promulgation_date, e.effective_date, e.detected_at,
            e.total_diff_count AS changed_count, d.official_url
       FROM ${schema}.legal_change_event e
       JOIN ${schema}.legal_document d ON d.id = e.document_id
      WHERE d.current_title = ANY($1::text[])
        AND e.status = 'PUBLISHED'
        AND e.event_type <> 'FIRST_ISSUE'
        AND COALESCE(e.promulgation_date, e.issuance_date, e.detected_at) >= $2::timestamptz
      ORDER BY COALESCE(e.promulgation_date, e.issuance_date, e.detected_at) DESC
      LIMIT ${limit}`,
    [titles, params.since.toISOString()],
  );
  return rows.map((r) => ({
    eventId: r.event_id,
    documentId: r.document_id,
    externalDocumentId: r.external_document_id,
    lawTitle: r.law_title,
    eventType: r.event_type,
    promulgationDate: toDate(r.promulgation_date),
    effectiveDate: toDate(r.effective_date),
    detectedAt: toDate(r.detected_at) ?? new Date(0),
    changedCount: Number(r.changed_count ?? 0),
    officialUrl: r.official_url,
  }));
}

// drizzle 이 postgres-js 의 날짜 파서를 꺼 두기 때문에 원시 SQL 결과의 날짜는 문자열로 온다.
// timestamp(시간대 없음) 문자열은 LawChange 수집기 규칙대로 UTC 로 해석한다.
function toDate(v: Date | string | null): Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  const s = /[zZ]|[+-]\d\d(:?\d\d)?$/.test(v) ? v : `${v.replace(" ", "T")}Z`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** LawChange 의 조문 비교 화면 주소. LAWCHANGE_URL 이 없으면 법제처 원문. */
export function lawChangeLink(c: LawChange): string | null {
  const base = process.env.LAWCHANGE_URL?.replace(/\/+$/, "");
  if (base) return `${base}/laws/${encodeURIComponent(c.externalDocumentId)}?event=${encodeURIComponent(c.eventId)}`;
  return c.officialUrl;
}
