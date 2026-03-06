ALTER TABLE "OutboxEvent"
  ADD COLUMN "next_retry_at" TIMESTAMP(3);

CREATE INDEX "OutboxEvent_status_next_retry_at_created_at_idx"
  ON "OutboxEvent"("status", "next_retry_at", "created_at");
