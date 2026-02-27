import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.interface';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  createTicket(@Req() req: { user: AuthUser }, @Body() dto: CreateTicketDto) {
    return this.ticketsService.createTicket(req.user, dto);
  }
}
