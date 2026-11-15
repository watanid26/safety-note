import type { Metadata } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "중대재해 점검노트 — 반기 의무이행 점검을 기록하고 보고서로",
    template: "%s · 중대재해 점검노트",
  },
  description:
    "중대재해처벌법 시행령의 반기 1회 점검 항목을 할 일로 만들고, 증빙과 개선 조치를 모아 보고서로 남기는 서비스. 관련 법령이 바뀌면 다시 확인할 항목을 알려드립니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
