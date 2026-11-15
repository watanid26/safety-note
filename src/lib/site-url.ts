// 사이트 절대 주소. 메일 본문 링크·canonical 에 쓴다. (LawChange 와 같은 규칙)
function normalize(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const withScheme = v.startsWith("http") ? v : `https://${v}`;
  return withScheme.replace(/\/+$/, "");
}

export function siteUrl(): string {
  return (
    normalize(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalize(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalize(process.env.VERCEL_URL) ??
    "http://localhost:3100"
  );
}
