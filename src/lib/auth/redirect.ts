// next 파라미터 검증 — open redirect 방지. 최종 경로가 /app 스코프일 때만 허용.
// (LawChange src/lib/auth/redirect.ts 와 같은 정책)
const DEFAULT_PATH = "/app";
const CANON_BASE = "https://safetynote.invalid";

export function sanitizeNextPath(value: string | null | undefined): string {
  if (typeof value !== "string" || value.length === 0) return DEFAULT_PATH;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return DEFAULT_PATH;
  }
  if (/^[a-z][a-z0-9+\-.]*:/i.test(decoded)) return DEFAULT_PATH;
  if (decoded.startsWith("//") || decoded.startsWith("\\\\") || decoded.startsWith("/\\") || decoded.startsWith("\\/")) {
    return DEFAULT_PATH;
  }
  if (!decoded.startsWith("/")) return DEFAULT_PATH;
  let parsed: URL;
  try {
    parsed = new URL(decoded, CANON_BASE);
  } catch {
    return DEFAULT_PATH;
  }
  if (parsed.origin !== new URL(CANON_BASE).origin) return DEFAULT_PATH;
  const path = parsed.pathname;
  if (path !== "/app" && !path.startsWith("/app/")) return DEFAULT_PATH;
  return `${path}${parsed.search}${parsed.hash}`;
}
