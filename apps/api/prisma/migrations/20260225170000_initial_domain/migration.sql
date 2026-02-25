-- CreateTable
CREATE TABLE "Customer" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
  "id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
  "id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "assignee_user_id" TEXT,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketComment" (
  "id" UUID NOT NULL,
  "ticket_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAttachment" (
  "id" UUID NOT NULL,
  "ticket_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "filename" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "object_key" TEXT NOT NULL,
  "uploaded_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
  "id" UUID NOT NULL,
  "customer_id" UUID,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "meta_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_customer_id_idx" ON "Project"("customer_id");

-- CreateIndex
CREATE INDEX "Ticket_customer_id_status_updated_at_idx" ON "Ticket"("customer_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "Ticket_customer_id_status_assignee_user_id_idx" ON "Ticket"("customer_id", "status", "assignee_user_id");

-- CreateIndex
CREATE INDEX "Ticket_customer_id_project_id_idx" ON "Ticket"("customer_id", "project_id");

-- CreateIndex
CREATE INDEX "TicketComment_ticket_id_idx" ON "TicketComment"("ticket_id");

-- CreateIndex
CREATE INDEX "TicketComment_customer_id_idx" ON "TicketComment"("customer_id");

-- CreateIndex
CREATE INDEX "TicketAttachment_ticket_id_idx" ON "TicketAttachment"("ticket_id");

-- CreateIndex
CREATE INDEX "TicketAttachment_customer_id_idx" ON "TicketAttachment"("customer_id");

-- CreateIndex
CREATE INDEX "AuditLog_customer_id_created_at_idx" ON "AuditLog"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "AuditLog_entity_type_entity_id_created_at_idx" ON "AuditLog"("entity_type", "entity_id", "created_at");

-- AddForeignKey
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "Customer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "Customer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment"
  ADD CONSTRAINT "TicketComment_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "Ticket"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment"
  ADD CONSTRAINT "TicketComment_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "Customer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttachment"
  ADD CONSTRAINT "TicketAttachment_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "Ticket"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttachment"
  ADD CONSTRAINT "TicketAttachment_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "Customer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
