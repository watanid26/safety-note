// 환경변수 이름을 한 곳에서 정리한다.
// 직접 넣은 값(DATABASE_URL 등)이 있으면 그것을, 없으면 Supabase ↔ Vercel 연동이
// 자동으로 넣어 주는 이름(POSTGRES_URL, SUPABASE_SECRET_KEY 등)을 쓴다.

/** Supabase 연동이 붙이는 supa=, Prisma 용 pgbouncer= 같은 옵션은 postgres 드라이버가 서버로 그대로 보내 오류가 나므로 뗀다. */
export function normalizeDbUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    for (const k of ["supa", "pgbouncer", "schema", "connection_limit"]) u.searchParams.delete(k);
    if (!u.searchParams.has("sslmode") && !/localhost|127\.0\.0\.1/.test(u.hostname)) u.searchParams.set("sslmode", "require");
    return u.toString();
  } catch {
    return raw;
  }
}

export function databaseUrl(): string | undefined {
  return normalizeDbUrl(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

export function supabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}

export function supabaseServiceKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}
