import { NotFoundException } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  it('prevents customer_user from fetching ticket across tenant', async () => {
    const prismaMock = {
      db: {
        ticket: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'ticket-1',
            customer_id: 'customer-b',
            project_id: 'project-1',
            type: 'Bug',
            status: 'OPEN',
            title: 'Cross tenant',
            description: 'Test',
            assignee_user_id: null,
            created_by_user_id: 'u-1',
            created_at: new Date(),
            updated_at: new Date(),
            comments: [],
            attachments: []
          })
        }
      }
    } as unknown as PrismaService;

    const service = new TicketsService(prismaMock);
    const user: AuthUser = {
      sub: 'u-2',
      email: null,
      roles: ['customer_user'],
      customerId: 'customer-a'
    };

    await expect(service.getTicketById(user, 'ticket-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
