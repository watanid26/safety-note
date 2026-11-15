import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// middleware 에서 세션 갱신. Supabase 가 3초 안에 응답하지 않으면 미인증으로 취급한다.
// (LawChange 운영 중 겪은 middleware 대기 프리징 대응을 그대로 가져옴)
export async function refreshSupabaseSession(req: NextRequest) {
  const response = NextResponse.next({ request: { headers: req.headers } });
  const supabase = createServerClient(supabaseUrl()!, supabaseAnonKey()!, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        req.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.set({ name, value: "", ...options });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("auth-timeout")), 3000)),
    ]);
    return { response, user: result.data.user };
  } catch (err) {
    console.warn("[middleware auth]", (err as Error).message);
    return { response, user: null };
  }
}
