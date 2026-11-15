// 간단한 메모리 기반 sliding window. 서버리스 인스턴스마다 따로 세지만,
// 1인 운영 초기의 남용 방지 용도로는 충분하다. (LawChange 와 같은 방식)
const buckets = new Map<string, number[]>();

export function takeRateLimit(opts: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();
  const list = (buckets.get(opts.key) ?? []).filter((t) => now - t < opts.windowMs);
  if (list.length >= opts.limit) {
    const retryAfterSeconds = Math.ceil((opts.windowMs - (now - list[0])) / 1000);
    buckets.set(opts.key, list);
    return { allowed: false, retryAfterSeconds };
  }
  list.push(now);
  buckets.set(opts.key, list);
  if (buckets.size > 5000) buckets.clear();
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
