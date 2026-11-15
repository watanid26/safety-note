import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { databaseUrl } from "@/lib/env";
import * as schema from "./schema";

// Supabase 연결 풀러(transaction 모드, 6543 포트)는 prepared statement 를 지원하지 않으므로 prepare:false.
// 연결은 처음 쿼리할 때 연다 — 환경변수가 없는 빌드 단계에서도 import 만으로는 실패하지 않는다.
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

function connect() {
  const url = databaseUrl();
  if (!url) throw new Error("DB 주소가 설정되지 않았습니다 (DATABASE_URL 또는 Supabase 연동의 POSTGRES_URL).");
  return postgres(url, { prepare: false, max: process.env.NODE_ENV === "production" ? 3 : 5, idle_timeout: 20 });
}

function getSql() {
  if (!globalForDb.sql) globalForDb.sql = connect();
  return globalForDb.sql;
}

// sql`...` · sql.unsafe(...) 를 그대로 쓸 수 있게 첫 사용 때 실제 연결로 위임한다.
export const sql = new Proxy(function () {} as unknown as ReturnType<typeof postgres>, {
  apply: (_t, _this, args) => (getSql() as unknown as (...a: unknown[]) => unknown)(...args),
  get: (_t, prop) => {
    const real = getSql() as unknown as Record<string | symbol, unknown>;
    const v = real[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});

type Db = ReturnType<typeof drizzle<typeof schema>>;
const globalForOrm = globalThis as unknown as { db?: Db };

function getDb(): Db {
  if (!globalForOrm.db) globalForOrm.db = drizzle(getSql(), { schema });
  return globalForOrm.db;
}

export const db = new Proxy({} as Db, {
  get: (_t, prop) => {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const v = real[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});
export * from "./schema";
