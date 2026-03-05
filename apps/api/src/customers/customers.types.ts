export interface CustomerDto {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerListResponseDto {
  items: CustomerDto[];
  page: number;
  pageSize: number;
  total: number;
}
