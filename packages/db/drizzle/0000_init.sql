CREATE TYPE "public"."ats_provider" AS ENUM('greenhouse', 'lever', 'ashby', 'none');--> statement-breakpoint
CREATE TYPE "public"."crawl_status" AS ENUM('pending', 'ok', 'error', 'invalid_slug');--> statement-breakpoint
CREATE TYPE "public"."funding_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."job_level" AS ENUM('intern', 'entry', 'mid', 'senior', 'staff', 'manager');--> statement-breakpoint
CREATE TYPE "public"."remote_type" AS ENUM('onsite', 'hybrid', 'remote_india', 'remote_global', 'remote_restricted');--> statement-breakpoint
CREATE TYPE "public"."role_category" AS ENUM('backend', 'frontend', 'fullstack', 'mobile', 'data', 'ml_ai', 'devops', 'security', 'qa', 'product', 'design', 'other_tech');--> statement-breakpoint
CREATE TYPE "public"."salary_band" AS ENUM('lt10', '10to20', '20to40', '40to70', '70plus', 'undisclosed');--> statement-breakpoint
CREATE TYPE "public"."salary_source" AS ENUM('employer', 'none');--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"state" text,
	"country" text DEFAULT 'IN' NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"website" text,
	"domain" text,
	"logo_url" text,
	"careers_url" text,
	"ats" "ats_provider" DEFAULT 'none' NOT NULL,
	"ats_slug" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"yc_batch" text,
	"hq_country" text,
	"has_india_office" boolean DEFAULT false NOT NULL,
	"last_crawled_at" timestamp with time zone,
	"crawl_status" "crawl_status" DEFAULT 'pending' NOT NULL,
	"crawl_error" text,
	"ats_detect_requested_at" timestamp with time zone,
	"open_jobs_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "crawl_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"worker" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"companies_ok" integer DEFAULT 0 NOT NULL,
	"companies_failed" integer DEFAULT 0 NOT NULL,
	"jobs_added" integer DEFAULT 0 NOT NULL,
	"jobs_updated" integer DEFAULT 0 NOT NULL,
	"jobs_closed" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fundings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"round" text NOT NULL,
	"amount" real,
	"currency" text,
	"amount_usd" bigint,
	"amount_inr" bigint,
	"investors" text[] DEFAULT '{}'::text[] NOT NULL,
	"announced_on" date NOT NULL,
	"source_url" text NOT NULL,
	"source_name" text NOT NULL,
	"headline" text,
	"status" "funding_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"source" "ats_provider" NOT NULL,
	"source_job_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"role_category" "role_category" NOT NULL,
	"level" "job_level" NOT NULL,
	"min_years" integer,
	"department" text,
	"description_text" text DEFAULT '' NOT NULL,
	"apply_url" text NOT NULL,
	"location_raw" text DEFAULT '' NOT NULL,
	"city_id" integer,
	"country" text,
	"remote_type" "remote_type" NOT NULL,
	"employment_type" text,
	"salary_min" real,
	"salary_max" real,
	"salary_currency" text,
	"salary_interval" text,
	"salary_min_inr_annual" bigint,
	"salary_max_inr_annual" bigint,
	"salary_band" "salary_band" DEFAULT 'undisclosed' NOT NULL,
	"salary_source" "salary_source" DEFAULT 'none' NOT NULL,
	"posted_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"fingerprint" text NOT NULL,
	"search_vector" "tsvector",
	CONSTRAINT "jobs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundings" ADD CONSTRAINT "fundings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companies_tags_gin" ON "companies" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "companies_domain_idx" ON "companies" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "companies_yc_batch_idx" ON "companies" USING btree ("yc_batch");--> statement-breakpoint
CREATE UNIQUE INDEX "fundings_source_url_uq" ON "fundings" USING btree ("source_url");--> statement-breakpoint
CREATE INDEX "fundings_status_announced_idx" ON "fundings" USING btree ("status","announced_on" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "fundings_company_idx" ON "fundings" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_source_job_uq" ON "jobs" USING btree ("source","source_job_id");--> statement-breakpoint
CREATE INDEX "jobs_open_posted_idx" ON "jobs" USING btree ("closed_at","posted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "jobs_company_idx" ON "jobs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "jobs_city_idx" ON "jobs" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "jobs_salary_band_idx" ON "jobs" USING btree ("salary_band");--> statement-breakpoint
CREATE INDEX "jobs_level_idx" ON "jobs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "jobs_role_category_idx" ON "jobs" USING btree ("role_category");--> statement-breakpoint
CREATE INDEX "jobs_remote_type_idx" ON "jobs" USING btree ("remote_type");--> statement-breakpoint
CREATE INDEX "jobs_fingerprint_idx" ON "jobs" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "jobs_search_gin" ON "jobs" USING gin ("search_vector");