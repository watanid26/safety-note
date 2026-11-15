import { NextResponse, type NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/auth/supabase-middleware";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { DEV_COOKIE, devLoginEnabled, supabaseConfigured } from "@/lib/auth/dev";
import { getClientIp, takeRateLimit } from "@/lib/security/rate-limit";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req.headers);

  const rl = rateLimitFor(pathname, ip);
  if (rl && !rl.allowed) {
    return new NextResponse(JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSeconds) },
    });
  }

  if (pathname.startsWith("/app")) {
    if (devLoginEnabled() && req.cookies.get(DEV_COOKIE)?.value) return NextResponse.next();
    if (!supabaseConfigured()) return toLogin(req, pathname);
    const { response, user } = await refreshSupabaseSession(req);
    if (!user) return toLogin(req, pathname);
    return response;
  }

  if ((pathname.startsWith("/login") || pathname.startsWith("/auth/")) && supabaseConfigured()) {
    const { response } = await refreshSupabaseSession(req);
    return response;
  }
  return NextResponse.next();
}

function toLogin(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", sanitizeNextPath(pathname));
  return NextResponse.redirect(url);
}

function rateLimitFor(pathname: string, ip: string) {
  if (pathname.startsWith("/auth/callback")) return takeRateLimit({ key: `cb:${ip}`, limit: 20, windowMs: 60_000 });
  if (pathname === "/login") return takeRateLimit({ key: `login:${ip}`, limit: 30, windowMs: 60_000 });
  if (pathname.startsWith("/api/free-checklist"))
    return takeRateLimit({ key: `download:${ip}`, limit: 10, windowMs: 60_000 });
  return null;
}

export const config = {
  matcher: ["/app/:path*", "/login", "/auth/:path*", "/api/free-checklist"],
};
