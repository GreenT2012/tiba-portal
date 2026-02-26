import { Controller, Get, Req } from '@nestjs/common';
import { AuthUser } from './auth/auth-user.interface';

@Controller('me')
export class MeController {
  @Get()
  getMe(@Req() req: { user: AuthUser }) {
    const { sub, roles, customerId, email } = req.user;
    return { sub, roles, customerId, email };
  }
}
