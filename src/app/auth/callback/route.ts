import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/auth/supabase-server";
import { sanitizeNextPath } from "@/lib/auth/redirect";

// 매직 링크 콜백 — code 를 세션으로 교환한다. 멤버 연결은 첫 화면에서 한다(findMemberContext).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNextPath(url.searchParams.get("next"));
  if (!code) return NextResponse.redirect(new URL("/login?error=missing_code", url));
  const { data, error } = await getServerSupabase().auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/login?error=exchange_failed", url));
  return NextResponse.redirect(new URL(next, url));
}
