import { Project } from '@prisma/client';
import { ProjectDto } from './projects.types';

export function toProjectDto(project: Project): ProjectDto {
  return {
    id: project.id,
    customerId: project.customer_id,
    name: project.name,
    createdAt: project.created_at,
    updatedAt: project.updated_at
  };
}
