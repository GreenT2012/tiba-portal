import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  projectId!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  @IsIn(['Bug', 'Feature', 'Content', 'Marketing', 'Tracking', 'Plugin'])
  type!: string;

  @IsOptional()
  @IsString()
  @IsIn(['OPEN', 'IN_PROGRESS', 'CLOSED'])
  status?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  assigneeUserId?: string;
}
