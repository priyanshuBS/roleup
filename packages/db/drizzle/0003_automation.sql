CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "query" text;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "entry" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "discovery_note" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "discovery_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fundings" ADD COLUMN "confidence" integer;--> statement-breakpoint
ALTER TABLE "fundings" ADD COLUMN "verify_notes" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "fundings" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fundings" ADD COLUMN "corroborations" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "fundings" ADD COLUMN "auto_approved" boolean DEFAULT false NOT NULL;