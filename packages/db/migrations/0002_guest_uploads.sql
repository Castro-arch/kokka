ALTER TABLE "media" ADD COLUMN "upload_id" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "uploaded_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "media_event_device_idx" ON "media" USING btree ("event_id","device_id","created_at" DESC NULLS LAST);