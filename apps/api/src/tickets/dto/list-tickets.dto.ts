export class ListTicketsDto {
  status?: string;
  projectId?: string;
  assignee?: 'me' | 'unassigned';
  view?: 'new' | 'open' | 'my';
  sort?: 'updatedAt' | 'createdAt';
  order?: 'asc' | 'desc';
  page?: string;
  pageSize?: string;
  customerId?: string;
}
