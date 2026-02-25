import { z } from 'zod';

export const ticketStatusSchema = z.enum(['open', 'in_progress', 'blocked', 'resolved']);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const ticketSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: ticketStatusSchema
});

export type Ticket = z.infer<typeof ticketSchema>;
