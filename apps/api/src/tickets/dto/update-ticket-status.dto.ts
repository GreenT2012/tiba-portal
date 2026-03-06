import { IsIn, IsString } from 'class-validator';
import { ticketStatusValues } from '@tiba/shared/tickets';

export class UpdateTicketStatusDto {
  @IsString()
  @IsIn(ticketStatusValues)
  status!: string;
}
