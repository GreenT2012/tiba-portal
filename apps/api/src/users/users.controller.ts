import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListUsersDto } from './dto/list-users.dto';
import { UserDto } from './users.types';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('tiba_agent', 'tiba_admin')
  @Get()
  listUsers(@Query() query: ListUsersDto): Promise<UserDto[]> {
    return this.usersService.listUsers(query);
  }
}
