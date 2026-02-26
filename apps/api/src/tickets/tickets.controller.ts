import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.interface';
import { RequireTenant } from '../auth/decorators/require-tenant.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketsService } from './tickets.service';

@RequireTenant()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  listTickets(@Req() req: { user: AuthUser }, @Query() query: ListTicketsDto) {
    return this.ticketsService.listTickets(req.user, query);
  }

  @Post()
  createTicket(@Req() req: { user: AuthUser }, @Body() payload: CreateTicketDto) {
    return this.ticketsService.createTicket(req.user, payload);
  }

  @Get(':id')
  getTicketById(@Req() req: { user: AuthUser }, @Param('id') id: string) {
    return this.ticketsService.getTicketById(req.user, id);
  }

  @Patch(':id/status')
  updateTicketStatus(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Body() payload: UpdateTicketStatusDto
  ) {
    return this.ticketsService.updateTicketStatus(req.user, id, payload);
  }

  @Roles('tiba_agent', 'tiba_admin')
  @Patch(':id/assign')
  assignTicket(@Req() req: { user: AuthUser }, @Param('id') id: string, @Body() payload: AssignTicketDto) {
    return this.ticketsService.assignTicket(req.user, id, payload);
  }

  @Post(':id/comments')
  addComment(@Req() req: { user: AuthUser }, @Param('id') id: string, @Body() payload: CreateTicketCommentDto) {
    return this.ticketsService.addComment(req.user, id, payload);
  }
}
