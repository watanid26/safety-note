"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/auth/supabase-browser";

export default function LoginForm({ next, supabaseUrl, supabaseAnonKey }: { next: string; supabaseUrl: string; supabaseAnonKey: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    const supabase = getBrowserSupabase(supabaseUrl, supabaseAnonKey);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } });
    if (error) {
      setState("error");
      setError(error.message);
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="mt-6 rounded-md bg-ok-soft px-4 py-3 text-sm text-ok">
        <b>{email}</b> 으로 로그인 링크를 보냈습니다. 메일함을 확인해 주세요. 스팸함에 있을 수도 있습니다.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <label className="label" htmlFor="email">회사 이메일</label>
      <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="input" />
      <button className="btn-primary w-full" disabled={state === "sending"}>
        {state === "sending" ? "보내는 중…" : "로그인 링크 받기"}
      </button>
      {state === "error" && <p className="text-sm text-bad">보내지 못했습니다: {error}</p>}
    </form>
  );
}
