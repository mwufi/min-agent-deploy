CREATE TABLE "user_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"accounts" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_accounts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE INDEX "user_accounts_user_id_idx" ON "user_accounts" USING btree ("user_id");