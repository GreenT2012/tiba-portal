import { Controller, Get, Req } from '@nestjs/common';
import { AuthUser } from './auth/auth-user.interface';

type MeDto = {
  sub: string;
  roles: string[];
  customerId: string | null;
  email: string | null;
};

@Controller('me')
export class MeController {
  @Get()
  getMe(@Req() req: { user: AuthUser }): MeDto {
    const { sub, roles, customerId, email } = req.user;
    return { sub, roles, customerId, email };
  }
}
