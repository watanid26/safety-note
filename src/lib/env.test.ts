import { describe, expect, it } from "vitest";
import { normalizeDbUrl } from "./env";

describe("normalizeDbUrl", () => {
  it("Supabase 연동 URL 의 supa 옵션을 떼고 sslmode 를 유지한다", () => {
    const u = normalizeDbUrl("postgres://postgres.abc:pw@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x");
    expect(u).toBe("postgres://postgres.abc:pw@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require");
  });
  it("pgbouncer 옵션을 떼고 sslmode 를 붙인다", () => {
    expect(normalizeDbUrl("postgresql://u:p@host.supabase.com:6543/postgres?pgbouncer=true")).toBe("postgresql://u:p@host.supabase.com:6543/postgres?sslmode=require");
  });
  it("로컬은 그대로", () => {
    expect(normalizeDbUrl("postgresql://sn:sn@localhost:5432/safetynote")).toBe("postgresql://sn:sn@localhost:5432/safetynote");
  });
});
