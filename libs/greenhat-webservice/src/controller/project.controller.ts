import { Controller } from '@nestjs/common';
import {
  BaseCrudController,
  CrudControllerConfig,
} from '@ubs-platform/crud-base';
import {
  GreenhatProjectDTO,
  GreenhatProjectSearchDTO,
} from '@ubs-platform/greenhat-common';
import { DocProject } from '@ubs-platform/greenhat-entity-mongo';
import { ProjectService } from '../service/project.service';

@Controller('greenhat/project')
@CrudControllerConfig({
  authorization: {
    ALL: { needsAuthenticated: true },
  },
})
export class ProjectController extends BaseCrudController<
  DocProject,
  string,
  GreenhatProjectDTO,
  GreenhatProjectDTO,
  GreenhatProjectSearchDTO
> {
  constructor(private readonly projectService: ProjectService) {
    super(projectService);
  }
}
