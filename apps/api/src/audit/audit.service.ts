import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type WriteAuditInput = {
  customerId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string | null;
  actorRoles?: string[];
  metaJson: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  write(input: WriteAuditInput, client?: Pick<PrismaService, 'auditLog'>) {
    const db = client ?? this.prisma;

    return db.auditLog.create({
      data: {
        customer_id: input.customerId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        action: input.action,
        actor_user_id: input.actorUserId,
        actor_role: this.derivePrimaryRole(input.actorRoles),
        meta_json: input.metaJson as any
      } as any
    });
  }

  private derivePrimaryRole(roles?: string[]): string | null {
    if (!roles || roles.length === 0) {
      return null;
    }
    if (roles.includes('tiba_admin')) {
      return 'tiba_admin';
    }
    if (roles.includes('tiba_agent')) {
      return 'tiba_agent';
    }
    if (roles.includes('customer_user')) {
      return 'customer_user';
    }
    return null;
  }
}
