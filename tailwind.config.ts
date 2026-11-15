import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Pretendard Variable"', "Pretendard", "-apple-system", "BlinkMacSystemFont", '"Apple SD Gothic Neo"', '"Noto Sans KR"', "sans-serif"],
      },
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        line: v("line"),
        ink: v("ink"),
        muted: v("muted"),
        brand: v("brand"),
        "brand-ink": v("brand-ink"),
        "brand-soft": v("brand-soft"),
        ok: v("ok"),
        "ok-soft": v("ok-soft"),
        warn: v("warn"),
        "warn-soft": v("warn-soft"),
        bad: v("bad"),
        "bad-soft": v("bad-soft"),
      },
      borderRadius: { DEFAULT: "6px" },
    },
  },
  plugins: [],
};
export default config;
