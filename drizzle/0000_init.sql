CREATE SCHEMA "safety";
--> statement-breakpoint
CREATE TABLE "safety"."action" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"description" text NOT NULL,
	"owner_name" text,
	"due_date" date,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"done_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety"."activity" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"period_id" text,
	"item_id" text,
	"actor_email" text,
	"type" text NOT NULL,
	"summary" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety"."check_item" (
	"id" text PRIMARY KEY NOT NULL,
	"period_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"basis" text NOT NULL,
	"guide" text NOT NULL,
	"cadence" text NOT NULL,
	"sort_order" integer NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"note" text,
	"checked_at" timestamp with time zone,
	"checked_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety"."company" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"site_name" text,
	"industry" text NOT NULL,
	"employee_band" text NOT NULL,
	"ceo_name" text,
	"ceo_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety"."evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"storage_path" text,
	"file_name" text,
	"mime_type" text,
	"size" integer,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety"."law_ack" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"change_event_id" text NOT NULL,
	"acked_by" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety"."member" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"auth_user_id" text,
	"email" text NOT NULL,
	"name" text,
	"role" text DEFAULT 'EDITOR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "safety"."period" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"year" integer NOT NULL,
	"half" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"signed_at" timestamp with time zone,
	"signed_by_name" text,
	"signed_by_email" text,
	"sign_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety"."reminder_log" (
	"id" text PRIMARY KEY NOT NULL,
	"period_id" text NOT NULL,
	"kind" text NOT NULL,
	"sent_to" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "safety"."action" ADD CONSTRAINT "action_item_id_check_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "safety"."check_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety"."activity" ADD CONSTRAINT "activity_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "safety"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety"."check_item" ADD CONSTRAINT "check_item_period_id_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "safety"."period"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety"."evidence" ADD CONSTRAINT "evidence_item_id_check_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "safety"."check_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety"."law_ack" ADD CONSTRAINT "law_ack_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "safety"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety"."member" ADD CONSTRAINT "member_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "safety"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety"."period" ADD CONSTRAINT "period_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "safety"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety"."reminder_log" ADD CONSTRAINT "reminder_log_period_id_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "safety"."period"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_item_idx" ON "safety"."action" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "action_status_due_idx" ON "safety"."action" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "activity_company_created_idx" ON "safety"."activity" USING btree ("company_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activity_item_idx" ON "safety"."activity" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "check_item_period_code_uq" ON "safety"."check_item" USING btree ("period_id","code");--> statement-breakpoint
CREATE INDEX "evidence_item_idx" ON "safety"."evidence" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "law_ack_company_event_uq" ON "safety"."law_ack" USING btree ("company_id","change_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_company_email_uq" ON "safety"."member" USING btree ("company_id","email");--> statement-breakpoint
CREATE INDEX "member_auth_user_idx" ON "safety"."member" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "member_email_idx" ON "safety"."member" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "period_company_half_uq" ON "safety"."period" USING btree ("company_id","year","half");--> statement-breakpoint
CREATE INDEX "period_status_end_idx" ON "safety"."period" USING btree ("status","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_period_kind_to_uq" ON "safety"."reminder_log" USING btree ("period_id","kind","sent_to");