import { ForbiddenException, Injectable } from '@nestjs/common';
import type { DashboardOverviewContract } from '@tiba/shared/dashboard';
import { AuthUser } from '../auth/auth-user.interface';
import { isCustomerUser, isInternalUser } from '../auth/authz';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(user: AuthUser): Promise<DashboardOverviewContract> {
    if (isCustomerUser(user)) {
      if (!user.customerId) {
        throw new ForbiddenException('customer_id claim is required for customer_user');
      }

      const customerId = user.customerId;
      const [openCount, totalCount, activeCount, archivedCount] = await this.prisma.$transaction([
        this.prisma.ticket.count({ where: { customer_id: customerId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        this.prisma.project.count({ where: { customer_id: customerId } }),
        this.prisma.project.count({ where: { customer_id: customerId, is_archived: false } }),
        this.prisma.project.count({ where: { customer_id: customerId, is_archived: true } })
      ]);

      return {
        modules: {
          tickets: {
            openCount,
            myCount: null,
            newCount: null,
            closedCount: null
          },
          projects: {
            totalCount,
            activeCount,
            archivedCount
          },
          admin: null
        }
      };
    }

    if (isInternalUser(user)) {
      const [newCount, openCount, myCount, closedCount, totalCount, activeCount, archivedCount, customerCount] =
        await this.prisma.$transaction([
          this.prisma.ticket.count({ where: { status: 'OPEN', assignee_user_id: null } }),
          this.prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
          this.prisma.ticket.count({ where: { assignee_user_id: user.sub, status: { not: 'CLOSED' } } }),
          this.prisma.ticket.count({ where: { status: 'CLOSED' } }),
          this.prisma.project.count(),
          this.prisma.project.count({ where: { is_archived: false } }),
          this.prisma.project.count({ where: { is_archived: true } }),
          this.prisma.customer.count()
        ]);

      return {
        modules: {
          tickets: {
            openCount,
            myCount,
            newCount,
            closedCount
          },
          projects: {
            totalCount,
            activeCount,
            archivedCount
          },
          admin: {
            customerCount,
            userManagementEnabled: user.roles.includes('tiba_admin')
          }
        }
      };
    }

    throw new ForbiddenException('Unsupported role');
  }
}
