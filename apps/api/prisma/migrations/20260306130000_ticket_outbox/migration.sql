CREATE TABLE "OutboxEvent" (
  "id" UUID NOT NULL,
  "topic" TEXT NOT NULL,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "customer_id" UUID,
  "payload_json" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_at" TIMESTAMP(3),

  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OutboxEvent_topic_status_created_at_idx" ON "OutboxEvent"("topic", "status", "created_at");
CREATE INDEX "OutboxEvent_aggregate_type_aggregate_id_created_at_idx" ON "OutboxEvent"("aggregate_type", "aggregate_id", "created_at");
CREATE INDEX "OutboxEvent_customer_id_created_at_idx" ON "OutboxEvent"("customer_id", "created_at");

ALTER TABLE "OutboxEvent"
  ADD CONSTRAINT "OutboxEvent_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
