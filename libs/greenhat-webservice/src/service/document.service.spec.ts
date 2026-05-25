import { of } from 'rxjs';
import { DocumentService } from './document.service';

const user = {
  id: 'user-1',
  roles: ['USER'],
} as any;

describe('DocumentService', () => {
  it('lists root documents when parentId is missing', async () => {
    const projectModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'project-1' }),
      }),
    } as any;

    const articleDocs = [
      {
        _id: 'doc-1',
        projectId: 'project-1',
        parentId: null,
        ancestors: [],
        slug: 'root',
        path: 'root',
        name: 'Root',
        titlesByLocale: {},
        contentsByLocale: {},
        deactivated: false,
        createdBy: 'user-1',
        updatedBy: 'user-1',
      },
    ];

    const articleModel = {
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(articleDocs),
        }),
      }),
    } as any;

    const eoService = {
      hasOwnership: jest.fn().mockReturnValue(of({ userId: 'user-1' })),
    } as any;

    const service = new DocumentService(articleModel, projectModel, eoService);

    const out = await service.listDocuments({ projectId: 'project-1' }, user);

    expect(out).toHaveLength(1);
    expect(articleModel.find).toHaveBeenCalledWith({
      projectId: 'project-1',
      deactivated: false,
      parentId: null,
    });
  });

  it('lists child documents when parentId is provided', async () => {
    const projectModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'project-1' }),
      }),
    } as any;

    const articleDocs = [
      {
        _id: 'doc-2',
        projectId: 'project-1',
        parentId: 'parent-1',
        ancestors: ['parent-1'],
        slug: 'child',
        path: 'root/child',
        name: 'Child',
        titlesByLocale: {},
        contentsByLocale: {},
        deactivated: false,
        createdBy: 'user-1',
        updatedBy: 'user-1',
      },
    ];

    const articleModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'parent-1',
          projectId: 'project-1',
          deactivated: false,
        }),
      }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(articleDocs),
        }),
      }),
    } as any;

    const eoService = {
      hasOwnership: jest.fn().mockReturnValue(of({ userId: 'user-1' })),
    } as any;

    const service = new DocumentService(articleModel, projectModel, eoService);

    const out = await service.listDocuments(
      { projectId: 'project-1', parentId: 'parent-1' },
      user,
    );

    expect(out).toHaveLength(1);
    expect(articleModel.find).toHaveBeenCalledWith({
      projectId: 'project-1',
      deactivated: false,
      parentId: 'parent-1',
    });
  });

  it('returns recursive remove preview counts', async () => {
    const projectModel = {} as any;

    const articleModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'root-1',
          projectId: 'project-1',
        }),
      }),
      countDocuments: jest
        .fn()
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(5) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(2) }),
    } as any;

    const eoService = {
      hasOwnership: jest.fn().mockReturnValue(of({ userId: 'user-1' })),
    } as any;

    const service = new DocumentService(articleModel, projectModel, eoService);

    const preview = await service.previewRecursiveRemove('root-1', user);

    expect(preview.rootDocumentId).toBe('root-1');
    expect(preview.descendantCount).toBe(5);
    expect(preview.directChildrenCount).toBe(2);
    expect(preview.totalWillBeRemoved).toBe(6);
  });
});
