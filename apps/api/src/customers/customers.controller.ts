import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../auth/auth-user.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersDto } from './dto/list-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';
import { CustomerDto, CustomerListResponseDto } from './customers.types';

@ApiTags('customers')
@Roles('tiba_agent', 'tiba_admin')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  listCustomers(@Req() req: { user: AuthUser }, @Query() query: ListCustomersDto): Promise<CustomerListResponseDto> {
    return this.customersService.listCustomers(req.user, query);
  }

  @Post()
  createCustomer(@Req() req: { user: AuthUser }, @Body() dto: CreateCustomerDto): Promise<CustomerDto> {
    return this.customersService.createCustomer(req.user, dto);
  }

  @Patch(':id')
  updateCustomer(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto
  ): Promise<CustomerDto> {
    return this.customersService.updateCustomer(req.user, id, dto);
  }
}
