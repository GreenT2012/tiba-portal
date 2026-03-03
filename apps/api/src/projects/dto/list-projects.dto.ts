export class ListProjectsDto {
  q?: string;
  customerId?: string;
  page?: string;
  pageSize?: string;
  sort?: 'name' | 'createdAt';
  order?: 'asc' | 'desc';
}
