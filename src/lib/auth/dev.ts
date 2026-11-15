// 개발용 로그인. Supabase 없이 로컬에서 화면을 확인하기 위한 장치.
// 운영(NODE_ENV=production)에서는 어떤 경우에도 켜지지 않는다.
export const DEV_COOKIE = "sn_dev_email";

export function devLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_LOGIN_ENABLED === "1";
}

export function supabaseConfigured(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  );
}
