export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_TYPES = ['Bug', 'Feature', 'Content', 'Marketing', 'Tracking', 'Plugin'] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export type TicketSummary = {
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
