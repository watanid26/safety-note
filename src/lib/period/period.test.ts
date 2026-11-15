import { describe, expect, it } from "vitest";
import { currentHalf, daysUntil, previousHalf, rangeOf, reminderKindFor, retentionUntil, todayKst, formatDay } from "./period";

describe("period", () => {
  it("한국 시간 기준으로 반기를 정한다 (UTC 6/30 15:00 = KST 7/1 00:00)", () => {
    expect(currentHalf(new Date("2026-06-30T14:59:00Z"))).toEqual({ year: 2026, half: 1 });
    expect(currentHalf(new Date("2026-06-30T15:00:00Z"))).toEqual({ year: 2026, half: 2 });
    expect(currentHalf(new Date("2026-12-31T15:00:00Z"))).toEqual({ year: 2027, half: 1 });
  });

  it("반기 범위", () => {
    const r1 = rangeOf({ year: 2026, half: 1 });
    expect(formatDay(r1.start)).toBe("2026.01.01");
    expect(formatDay(r1.end)).toBe("2026.06.30");
    const r2 = rangeOf({ year: 2026, half: 2 });
    expect(formatDay(r2.end)).toBe("2026.12.31");
  });

  it("이전 반기", () => {
    expect(previousHalf({ year: 2026, half: 1 })).toEqual({ year: 2025, half: 2 });
    expect(previousHalf({ year: 2026, half: 2 })).toEqual({ year: 2026, half: 1 });
  });

  it("마감까지 남은 날", () => {
    const end = rangeOf({ year: 2026, half: 2 }).end;
    expect(daysUntil(end, new Date("2026-12-01T03:00:00Z"))).toBe(30);
    expect(daysUntil(end, new Date("2026-12-31T03:00:00Z"))).toBe(0);
    expect(daysUntil(end, new Date("2027-01-01T03:00:00Z"))).toBe(-1);
  });

  it("알림 종류", () => {
    expect(reminderKindFor(30)).toBe("D30");
    expect(reminderKindFor(29)).toBeNull();
    expect(reminderKindFor(7)).toBe("D7");
    expect(reminderKindFor(1)).toBe("D1");
    expect(reminderKindFor(-1)).toBe("OVERDUE");
  });

  it("5년 보관 기한", () => {
    expect(formatDay(retentionUntil(rangeOf({ year: 2026, half: 1 }).end))).toBe("2031.06.30");
  });

  it("todayKst 는 UTC 자정 날짜", () => {
    expect(todayKst(new Date("2026-10-05T16:00:00Z")).toISOString()).toBe("2026-10-06T00:00:00.000Z");
  });
});
