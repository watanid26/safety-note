-- Supabase 의 Data API(anon/authenticated 키)로 safety 스키마에 접근하지 못하게 막는 이중 잠금.
-- 이 앱은 서버에서 DB 소유자 계정으로만 접근하므로(소유자는 RLS 를 우회) 정책 없이 켜 두기만 한다.
-- 또한 Supabase 대시보드의 API 설정에서 safety 스키마를 "Exposed schemas" 에 추가하지 말 것.
ALTER TABLE "safety"."company" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "safety"."member" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "safety"."period" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "safety"."check_item" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "safety"."evidence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "safety"."action" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "safety"."activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "safety"."reminder_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "safety"."law_ack" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON SCHEMA "safety" FROM anon, authenticated;
