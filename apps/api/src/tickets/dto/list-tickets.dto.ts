export class ListTicketsDto {
  status?: string;
  projectId?: string;
  assignee?: string;
  view?: string;
  sort?: string;
  order?: string;
  page?: string | number;
  pageSize?: string | number;
  customerId?: string;
}
