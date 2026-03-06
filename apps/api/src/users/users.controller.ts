import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListUsersDto } from './dto/list-users.dto';
import { ProvisionUserDto } from './dto/provision-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ProvisionedUserDto, ResetPasswordResponseDto, UserDto } from './users.types';
import { UsersService } from './users.service';

@ApiTags('admin', 'users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('tiba_agent', 'tiba_admin')
  @Get()
  listUsers(@Query() query: ListUsersDto): Promise<UserDto[]> {
    return this.usersService.listUsers(query);
  }

  @Roles('tiba_admin')
  @Post('provision')
  @ApiBody({ type: ProvisionUserDto })
  @ApiOkResponse({ type: Object })
  provisionUser(@Body() dto: ProvisionUserDto): Promise<ProvisionedUserDto> {
    return this.usersService.provisionUser(dto);
  }

  @Roles('tiba_admin')
  @Post(':id/reset-password')
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ type: Object })
  resetPassword(@Param('id') userId: string, @Body() dto: ResetPasswordDto): Promise<ResetPasswordResponseDto> {
    return this.usersService.resetPassword(userId, dto);
  }
}
