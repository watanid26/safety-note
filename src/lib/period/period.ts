// 반기 계산. 모든 날짜는 한국 시간(Asia/Seoul) 기준 달력 날짜로 다룬다.
//   상반기: 1월 1일 ~ 6월 30일
//   하반기: 7월 1일 ~ 12월 31일
// DB 에는 @db.Date (시간 없는 날짜)로 저장하므로 UTC 자정 Date 객체를 쓴다.

export interface HalfYear {
  year: number;
  half: 1 | 2;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 지금 이 순간의 한국 달력 날짜 (UTC 자정 Date). */
export function todayKst(now: Date = new Date()): Date {
  const k = new Date(now.getTime() + KST_OFFSET_MS);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()));
}

export function halfOf(date: Date): HalfYear {
  return { year: date.getUTCFullYear(), half: date.getUTCMonth() < 6 ? 1 : 2 };
}

export function currentHalf(now: Date = new Date()): HalfYear {
  return halfOf(todayKst(now));
}

export function rangeOf({ year, half }: HalfYear): { start: Date; end: Date } {
  return half === 1
    ? { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 5, 30)) }
    : { start: new Date(Date.UTC(year, 6, 1)), end: new Date(Date.UTC(year, 11, 31)) };
}

export function previousHalf({ year, half }: HalfYear): HalfYear {
  return half === 1 ? { year: year - 1, half: 2 } : { year, half: 1 };
}

export function halfLabel({ year, half }: HalfYear): string {
  return `${year}년 ${half === 1 ? "상반기" : "하반기"}`;
}

/** 마감(회차 마지막 날)까지 남은 날짜. 당일이면 0, 지났으면 음수. */
export function daysUntil(end: Date, now: Date = new Date()): number {
  const today = todayKst(now);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

export type ReminderKind = "D30" | "D7" | "D1" | "OVERDUE";

/** 오늘 보낼 알림 종류. 매일 한 번 도는 cron 이 부른다. 정확히 그 날에만 보낸다. */
export function reminderKindFor(daysLeft: number): ReminderKind | null {
  if (daysLeft === 30) return "D30";
  if (daysLeft === 7) return "D7";
  if (daysLeft === 1) return "D1";
  if (daysLeft === -1) return "OVERDUE";
  return null;
}

/** 5년 보관 기한: 회차 종료일(=점검 이행 기준일)로부터 5년. 시행령 제13조. */
export function retentionUntil(end: Date): Date {
  return new Date(Date.UTC(end.getUTCFullYear() + 5, end.getUTCMonth(), end.getUTCDate()));
}

export function formatDate(d: Date | null | undefined): string {
  if (!d) return "-";
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  const y = k.getUTCFullYear();
  const m = String(k.getUTCMonth() + 1).padStart(2, "0");
  const day = String(k.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/** @db.Date 값(UTC 자정)을 그대로 날짜로 표시. KST 보정을 하지 않는다. */
export function formatDay(d: Date | null | undefined): string {
  if (!d) return "-";
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "-";
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  return `${formatDate(d)} ${String(k.getUTCHours()).padStart(2, "0")}:${String(k.getUTCMinutes()).padStart(2, "0")}`;
}
