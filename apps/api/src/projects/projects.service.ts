import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ListProjectsDto } from './dto/list-projects.dto';
import { toProjectDto } from './projects.mapper';
import { ProjectListResponseDto } from './projects.types';

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
