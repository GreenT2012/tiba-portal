import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as PrismaClientPackage from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly db: any;

  constructor() {
    this.db = new (PrismaClientPackage as any).PrismaClient();
  }

  async onModuleInit() {
    await this.db.$connect();
  }

  async onModuleDestroy() {
    await this.db.$disconnect();
  }
}
