export type TicketCommentDto = {
  id: string;
  ticketId: string;
  customerId: string;
  authorUserId: string;
  body: string;
  createdAt: Date;
};

export type TicketAttachmentDto = {
  id: string;
  ticketId: string;
  customerId: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  objectKey: string;
  uploadedByUserId: string;
  createdAt: Date;
};

export type TicketSummaryDto = {
  id: string;
  title: string;
  status: string;
  type: string;
  projectId: string;
  customerId: string;
  assigneeUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TicketDto = TicketSummaryDto & {
  description: string;
  createdByUserId: string | null;
  comments: TicketCommentDto[];
  attachments: TicketAttachmentDto[];
};

export type TicketListResponseDto = {
  items: TicketSummaryDto[];
  page: number;
  pageSize: number;
  total: number;
};

export type PresignUploadAttachmentResponseDto = {
  attachmentId: string;
  objectKey: string;
  uploadUrl: string;
  requiredHeaders: {
    'Content-Type': string;
  };
};

export type PresignDownloadAttachmentResponseDto = {
  downloadUrl: string;
};
