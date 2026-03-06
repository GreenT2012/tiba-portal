import { IsIn, IsOptional, IsString } from 'class-validator';
import { ticketStatusValues, ticketTypeValues } from '@tiba/shared';

export class CreateTicketDto {
  @IsString()
  projectId!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  @IsIn(ticketTypeValues)
  type!: string;

  @IsOptional()
  @IsString()
  @IsIn(ticketStatusValues)
  status?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  assigneeUserId?: string;
}
