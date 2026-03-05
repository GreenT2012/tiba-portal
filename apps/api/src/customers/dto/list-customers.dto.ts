export class ListCustomersDto {
  q?: string;
  page?: string;
  pageSize?: string;
  sort?: 'name' | 'createdAt';
  order?: 'asc' | 'desc';
}
