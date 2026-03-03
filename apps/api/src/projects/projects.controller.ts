import { Controller, Get, Query, Req } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.interface';
import { ListProjectsDto } from './dto/list-projects.dto';
import { ProjectListResponseDto } from './projects.types';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  listProjects(@Req() req: { user: AuthUser }, @Query() query: ListProjectsDto): Promise<ProjectListResponseDto> {
    return this.projectsService.listProjects(req.user, query);
  }
}
