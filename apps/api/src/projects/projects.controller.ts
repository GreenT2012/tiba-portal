import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.interface';
import { ListProjectsDto } from './dto/list-projects.dto';
import { ProjectDto, ProjectListResponseDto } from './projects.types';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  listProjects(@Req() req: { user: AuthUser }, @Query() query: ListProjectsDto): Promise<ProjectListResponseDto> {
    return this.projectsService.listProjects(req.user, query);
  }

  @Get(':id')
  getProjectById(@Req() req: { user: AuthUser }, @Param('id') id: string): Promise<ProjectDto> {
    return this.projectsService.getProjectById(req.user, id);
  }
}
