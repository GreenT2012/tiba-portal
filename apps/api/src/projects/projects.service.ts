import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { toProjectDto } from './projects.mapper';
import { ProjectDto, ProjectListResponseDto } from './projects.types';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async listProjects(user: AuthUser, query: ListProjectsDto): Promise<ProjectListResponseDto> {
    const customerId = this.resolveCustomerScope(user, query.customerId);
    const page = this.parsePositiveInt(query.page, 1, 'page');
    const pageSize = Math.min(this.parsePositiveInt(query.pageSize, 20, 'pageSize'), 100);
    const sort = this.parseSort(query.sort);
    const order = this.parseOrder(query.order);

    const where: Prisma.ProjectWhereInput = {
      ...(customerId ? { customer_id: customerId } : {}),
      ...(query.q?.trim() ? { name: { contains: query.q.trim(), mode: 'insensitive' } } : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.project.count({ where })
    ]);

    return {
      items: items.map(toProjectDto),
      page,
      pageSize,
      total
    };
  }

  async getProjectById(user: AuthUser, id: string): Promise<ProjectDto> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (this.isCustomerUser(user) && project.customer_id !== user.customerId) {
      throw new ForbiddenException('Project is outside your tenant scope');
    }

    return toProjectDto(project);
  }

  async createProject(user: AuthUser, dto: CreateProjectDto): Promise<ProjectDto> {
    this.assertInternalUser(user);

    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }
    if (!dto.customerId) {
      throw new BadRequestException('customerId is required');
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    const project = await this.prisma.project.create({
      data: {
        customer_id: dto.customerId,
        name
      }
    });

    return toProjectDto(project);
  }

  async updateProject(user: AuthUser, id: string, dto: UpdateProjectDto): Promise<ProjectDto> {
    this.assertInternalUser(user);

    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const data: Prisma.ProjectUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('name must not be empty');
      }
      data.name = name;
    }
    if (dto.isArchived !== undefined) {
      data.is_archived = dto.isArchived;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    const updated = await this.prisma.project.update({ where: { id }, data });
    return toProjectDto(updated);
  }

  private resolveCustomerScope(user: AuthUser, requestedCustomerId?: string): string | undefined {
    if (user.roles.includes('customer_user')) {
      if (!user.customerId) {
        throw new ForbiddenException('customer_id claim is required for customer_user');
      }
      if (requestedCustomerId) {
        throw new ForbiddenException('customerId is not allowed for customer_user');
      }
      return user.customerId;
    }

    if (user.roles.includes('tiba_agent') || user.roles.includes('tiba_admin')) {
      return requestedCustomerId;
    }

    throw new ForbiddenException('Unsupported role');
  }

  private isCustomerUser(user: AuthUser) {
    return user.roles.includes('customer_user');
  }

  private assertInternalUser(user: AuthUser) {
    if (this.isCustomerUser(user)) {
      throw new ForbiddenException('customer_user is not allowed');
    }
    if (!user.roles.includes('tiba_agent') && !user.roles.includes('tiba_admin')) {
      throw new ForbiddenException('Unsupported role');
    }
  }

  private parsePositiveInt(value: string | undefined, fallback: number, field: string): number {
    if (value === undefined) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }

    return parsed;
  }

  private parseSort(value: string | undefined): 'name' | 'created_at' {
    if (value === undefined || value === 'name') {
      return 'name';
    }
    if (value === 'createdAt') {
      return 'created_at';
    }
    throw new BadRequestException('sort must be one of: name, createdAt');
  }

  private parseOrder(value: string | undefined): Prisma.SortOrder {
    if (value === undefined || value === 'asc') {
      return 'asc';
    }
    if (value === 'desc') {
      return 'desc';
    }
    throw new BadRequestException('order must be one of: asc, desc');
  }
}
