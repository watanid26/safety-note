import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// 이 프로젝트의 마이그레이션은 safety 스키마만 다룬다. (LawChange 의 public 스키마는 건드리지 않음)
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["safety"],
  migrations: { schema: "safety", table: "__drizzle_migrations" },
  dbCredentials: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL! },
  strict: true,
});
