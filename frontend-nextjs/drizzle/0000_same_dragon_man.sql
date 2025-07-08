CREATE TABLE "email_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"from" text,
	"to" jsonb,
	"cc" jsonb,
	"bcc" jsonb,
	"subject" text,
	"snippet" text,
	"body" text,
	"body_html" text,
	"label_ids" jsonb,
	"is_unread" boolean DEFAULT true,
	"history_id" text,
	"internal_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"subject" text,
	"snippet" text,
	"history_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gmail_sync_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"history_id" text NOT NULL,
	"sync_type" text NOT NULL,
	"messages_added" integer DEFAULT 0,
	"messages_modified" integer DEFAULT 0,
	"messages_deleted" integer DEFAULT 0,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_messages_user_account_idx" ON "email_messages" USING btree ("user_id","account_id");--> statement-breakpoint
CREATE INDEX "email_messages_thread_id_idx" ON "email_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_messages_message_id_idx" ON "email_messages" USING btree ("message_id","account_id");--> statement-breakpoint
CREATE INDEX "email_messages_internal_date_idx" ON "email_messages" USING btree ("internal_date");--> statement-breakpoint
CREATE INDEX "email_threads_user_account_idx" ON "email_threads" USING btree ("user_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_threads_thread_id_idx" ON "email_threads" USING btree ("thread_id","account_id");--> statement-breakpoint
CREATE INDEX "gmail_sync_history_user_account_idx" ON "gmail_sync_history" USING btree ("user_id","account_id");--> statement-breakpoint
CREATE INDEX "gmail_sync_history_created_at_idx" ON "gmail_sync_history" USING btree ("created_at");