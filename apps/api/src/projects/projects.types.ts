export interface ProjectDto {
  id: string;
  customerId: string;
  name: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectListResponseDto {
  items: ProjectDto[];
  page: number;
  pageSize: number;
  total: number;
}
