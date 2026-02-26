export class CreateTicketDto {
  customerId?: string;
  projectId!: string;
  type!: string;
  status!: string;
  title!: string;
  description!: string;
  assigneeUserId?: string;
}
