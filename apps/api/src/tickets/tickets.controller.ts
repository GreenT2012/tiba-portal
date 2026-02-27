import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { PresignUploadAttachmentDto } from './dto/presign-upload-attachment.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketsService } from './tickets.service';
import {
  PresignDownloadAttachmentResponseDto,
  PresignUploadAttachmentResponseDto,
  TicketCommentDto,
  TicketDto,
  TicketListResponseDto
} from './tickets.types';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  listTickets(@Req() req: { user: AuthUser }, @Query() query: ListTicketsDto): Promise<TicketListResponseDto> {
    return this.ticketsService.listTickets(req.user, query);
  }

  @Post()
  createTicket(@Req() req: { user: AuthUser }, @Body() dto: CreateTicketDto): Promise<TicketDto> {
    return this.ticketsService.createTicket(req.user, dto);
  }

  @Get(':id')
  getTicketById(@Req() req: { user: AuthUser }, @Param('id') id: string): Promise<TicketDto> {
    return this.ticketsService.getTicketById(req.user, id);
  }

  @Patch(':id/status')
  updateTicketStatus(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto
  ): Promise<TicketDto> {
    return this.ticketsService.updateTicketStatus(req.user, id, dto);
  }

  @Roles('tiba_agent', 'tiba_admin')
  @Patch(':id/assign')
  assignTicket(@Req() req: { user: AuthUser }, @Param('id') id: string, @Body() dto: AssignTicketDto): Promise<TicketDto> {
    return this.ticketsService.assignTicket(req.user, id, dto);
  }

  @Post(':id/comments')
  addComment(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: CreateTicketCommentDto
  ): Promise<TicketCommentDto> {
    return this.ticketsService.addComment(req.user, id, dto);
  }

  @Post(':id/attachments/presign-upload')
  presignAttachmentUpload(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Body() dto: PresignUploadAttachmentDto
  ): Promise<PresignUploadAttachmentResponseDto> {
    return this.ticketsService.presignAttachmentUpload(req.user, id, dto);
  }

  @Get(':id/attachments/:attachmentId/presign-download')
  presignAttachmentDownload(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string
  ): Promise<PresignDownloadAttachmentResponseDto> {
    return this.ticketsService.presignAttachmentDownload(req.user, id, attachmentId);
  }
}
