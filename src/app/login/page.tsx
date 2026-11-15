import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DEV_COOKIE, devLoginEnabled, supabaseConfigured } from "@/lib/auth/dev";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { getAuthUser } from "@/lib/auth/session";
import LoginForm from "./LoginForm";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

export const metadata = { title: "로그인" };

async function devLogin(formData: FormData) {
  "use server";
  if (!devLoginEnabled()) throw new Error("개발용 로그인이 꺼져 있습니다.");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("이메일 형식이 아닙니다.");
  cookies().set(DEV_COOKIE, email, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(sanitizeNextPath(String(formData.get("next") ?? "")));
}

const ERRORS: Record<string, string> = {
  missing_code: "로그인 링크가 올바르지 않습니다. 다시 요청해 주세요.",
  exchange_failed: "로그인 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요.",
};

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = sanitizeNextPath(searchParams.next);
  if (await getAuthUser()) redirect(next);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 text-sm text-muted hover:text-ink">← 중대재해 점검노트</Link>
      <h1 className="text-2xl font-semibold">로그인</h1>
      <p className="mt-2 text-sm text-muted">이메일로 로그인 링크를 보내드립니다. 비밀번호는 필요 없습니다.</p>
      {searchParams.error && (
        <p className="mt-4 rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">{ERRORS[searchParams.error] ?? "로그인에 실패했습니다."}</p>
      )}
      {supabaseConfigured() ? (
        <LoginForm next={next} supabaseUrl={supabaseUrl()!} supabaseAnonKey={supabaseAnonKey()!} />
      ) : (
        <p className="mt-6 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          로그인 서버가 설정되지 않았습니다. (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)
        </p>
      )}
      {devLoginEnabled() && (
        <form action={devLogin} className="mt-8 rounded-lg border border-dashed border-line p-4">
          <p className="mb-2 text-xs font-medium text-muted">개발용 로그인 (운영에서는 보이지 않음)</p>
          <input type="hidden" name="next" value={next} />
          <input name="email" type="email" required defaultValue="dev@example.com" className="input" />
          <button className="btn-secondary mt-2 w-full">개발용으로 들어가기</button>
        </form>
      )}
    </main>
  );
}
