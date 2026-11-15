import { createBrowserClient } from "@supabase/ssr";

// 주소와 공개(anon/publishable) 키는 서버 화면에서 내려받는다.
// 빌드할 때 값이 박히는 NEXT_PUBLIC_ 변수에 기대지 않아, Supabase 연동이 나중에 붙어도 동작한다.
export function getBrowserSupabase(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey);
}
