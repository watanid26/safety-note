"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app", label: "이번 반기", match: (p: string) => p === "/app" || p.startsWith("/app/periods") || p.startsWith("/app/items") },
  { href: "/app/laws", label: "법령 변경", match: (p: string) => p.startsWith("/app/laws") },
  { href: "/app/archive", label: "보관함", match: (p: string) => p.startsWith("/app/archive") },
  { href: "/app/settings", label: "설정", match: (p: string) => p.startsWith("/app/settings") },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 text-sm">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded px-2.5 py-1 ${l.match(pathname) ? "bg-brand-soft font-medium text-brand-ink" : "text-muted hover:text-ink"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
