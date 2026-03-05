import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
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

  @Roles('tiba_agent', 'tiba_admin')
  @Post()
  createProject(@Req() req: { user: AuthUser }, @Body() dto: CreateProjectDto): Promise<ProjectDto> {
    return this.projectsService.createProject(req.user, dto);
  }

  @Roles('tiba_agent', 'tiba_admin')
  @Patch(':id')
  updateProject(@Req() req: { user: AuthUser }, @Param('id') id: string, @Body() dto: UpdateProjectDto): Promise<ProjectDto> {
    return this.projectsService.updateProject(req.user, id, dto);
  }
}
