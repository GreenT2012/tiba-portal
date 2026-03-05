import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersDto } from './dto/list-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { toCustomerDto } from './customers.mapper';
import { CustomerDto, CustomerListResponseDto } from './customers.types';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async listCustomers(user: AuthUser, query: ListCustomersDto): Promise<CustomerListResponseDto> {
    this.assertInternalUser(user);

    const page = this.parsePositiveInt(query.page, 1, 'page');
    const pageSize = Math.min(this.parsePositiveInt(query.pageSize, 20, 'pageSize'), 100);
    const sort = this.parseSort(query.sort);
    const order = this.parseOrder(query.order);

    const where: Prisma.CustomerWhereInput = query.q?.trim()
      ? { name: { contains: query.q.trim(), mode: 'insensitive' } }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.customer.count({ where })
    ]);

    return {
      items: items.map(toCustomerDto),
      page,
      pageSize,
      total
    };
  }

  async createCustomer(user: AuthUser, dto: CreateCustomerDto): Promise<CustomerDto> {
    this.assertInternalUser(user);

    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    const created = await this.prisma.customer.create({ data: { name } });
    return toCustomerDto(created);
  }

  async updateCustomer(user: AuthUser, id: string, dto: UpdateCustomerDto): Promise<CustomerDto> {
    this.assertInternalUser(user);

    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { name }
    });

    return toCustomerDto(updated);
  }

  private assertInternalUser(user: AuthUser) {
    if (user.roles.includes('customer_user')) {
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
