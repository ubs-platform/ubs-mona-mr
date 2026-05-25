import { of } from 'rxjs';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  it('assigns OWNER ownership after project create', async () => {
    const projectModel = {} as any;
    const eoService = {
      insertOwnership: jest.fn().mockResolvedValue(undefined),
      searchOwnershipEntityIdsByUser: jest.fn().mockReturnValue(of([])),
    } as any;

    const service = new ProjectService(projectModel, eoService);

    await service.afterCreate(
      { _id: 'project-1', slug: 'p1', title: 'Project 1' },
      {
        slug: 'p1',
        title: 'Project 1',
        entityOwnershipGroupId: 'group-1',
      },
      { id: 'user-1' } as any,
    );

    expect(eoService.insertOwnership).toHaveBeenCalledWith(
      expect.objectContaining({
        entityGroup: 'GREENHAT',
        entityName: 'PROJECT',
        entityId: 'project-1',
      }),
    );
  });

  it('soft deletes project on remove', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const projectModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'project-1',
          slug: 'project-1',
          title: 'Project 1',
          description: '',
          visibility: 'private',
          deactivated: false,
          createdBy: 'user-1',
          updatedBy: 'user-1',
          save,
        }),
      }),
    } as any;

    const eoService = {
      insertOwnership: jest.fn(),
      searchOwnershipEntityIdsByUser: jest.fn().mockReturnValue(of([])),
    } as any;

    const service = new ProjectService(projectModel, eoService);

    const out = await service.remove('project-1', { id: 'user-2' } as any);

    expect(save).toHaveBeenCalled();
    expect(out.deactivated).toBe(true);
    expect(out.updatedBy).toBe('user-2');
  });
});
