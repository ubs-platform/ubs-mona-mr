/// <reference types="jest" />
import { Capability } from '@ubs-platform/users-common';
import { EntityOwnershipGroupService } from './entity-ownership-group.service';

describe('EntityOwnershipGroupService', () => {
    let service: EntityOwnershipGroupService;
    let eogModel: any;
    let eogInvitationModel: any;
    let mapper: any;
    let userServiceLocal: any;
    let emailService: any;
    let eoModel: any;

    beforeEach(() => {
        eogModel = {
            findById: jest.fn(),
            findOne: jest.fn(),
            updateOne: jest.fn(),
        };
        eogInvitationModel = {};
        mapper = {
            toDto: jest.fn(),
            toEntityCreate: jest.fn(),
        };
        userServiceLocal = {
            findById: jest.fn(),
            findUserByLogin: jest.fn(),
        };
        emailService = {};
        eoModel = {};

        service = new EntityOwnershipGroupService(
            eogModel,
            eogInvitationModel,
            mapper,
            userServiceLocal,
            emailService,
            eoModel,
        );
    });

    const groupInput = {
        name: 'Platform', description: 'Admin team', creationKey: 'stable-key',
        initialUserEntityCapabilities: [],
    };

    it('reuses a group after a lost response and rejects changed retry input', async () => {
        let stored: object | null = null;
        eogModel.findOne.mockImplementation(() => ({ exec: async () => stored }));
        const entity = { save: jest.fn().mockImplementation(async () => { stored = entity; }) };
        mapper.toEntityCreate.mockReturnValue(entity);
        mapper.toDto.mockImplementation((group: object) => group);
        const first = await service.createGroup(groupInput, 'admin');
        expect(await service.createGroup(groupInput, 'admin')).toBe(first);
        expect(entity.save).toHaveBeenCalledTimes(1);
        await expect(service.createGroup({ ...groupInput, name: 'Changed' }, 'admin')).rejects.toThrow('different input');
    });

    it('resolves a concurrent duplicate-key insert to the same group', async () => {
        const saved = { save: jest.fn() };
        mapper.toEntityCreate.mockReturnValue(saved);
        eogModel.findOne.mockReturnValueOnce({ exec: async () => null });
        saved.save.mockRejectedValueOnce({ code: 11000 });
        eogModel.findOne.mockImplementation(() => ({ exec: async () => saved }));
        mapper.toDto.mockReturnValue({ id: 'same-group' });
        expect(await service.createGroup(groupInput, 'admin')).toEqual({ id: 'same-group' });
    });

    it('scopes creation keys to users and surfaces real persistence failures', async () => {
        mapper.toEntityCreate.mockReturnValue({ save: jest.fn() });
        eogModel.findOne.mockReturnValue({ exec: async () => null });
        await service.createGroup(groupInput, 'admin-a');
        await service.createGroup(groupInput, 'admin-b');
        expect(eogModel.findOne.mock.calls[0][0]).not.toEqual(eogModel.findOne.mock.calls[1][0]);
        mapper.toEntityCreate.mockReturnValue({ save: jest.fn().mockRejectedValue(new Error('database offline')) });
        await expect(service.createGroup(groupInput, 'admin-a')).rejects.toThrow('database offline');
    });

    it.each(['', ' ', 'x'.repeat(201), 42])('rejects invalid retry keys', async key => {
        await expect(service.createGroup({ ...groupInput, creationKey: key as string }, 'admin')).rejects.toThrow('Invalid group creation key');
    });

    it('allows a group owner to edit their own capabilities', async () => {
        const group = {
            _id: 'group-1',
            __v: 0,
            userCapabilities: [
                {
                    userId: 'owner-user',
                    groupCapabilities: [Capability.OWNER],
                    entityCapabilities: [],
                },
            ],
        };

        eogModel.findById.mockResolvedValue(group);
        eogModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
        mapper.toDto.mockReturnValue({ id: 'group-1' });

        await expect(
            service.updateUserCapability(
                'group-1',
                {
                    userId: 'owner-user',
                    groupCapabilities: [Capability.OWNER],
                    entityCapabilities: [],
                },
                { id: 'owner-user', roles: [] } as any,
            ),
        ).resolves.toBeDefined();

        expect(eogModel.updateOne).toHaveBeenCalled();
    });

    it('allows a group owner to remove another member', async () => {
        const group = {
            _id: 'group-1',
            __v: 0,
            userCapabilities: [
                {
                    userId: 'owner-user',
                    groupCapabilities: [Capability.OWNER],
                    entityCapabilities: [],
                },
                {
                    userId: 'member-user',
                    groupCapabilities: [],
                    entityCapabilities: [],
                },
            ],
        };

        eogModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(group) });
        eogModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

        await expect(
            service.removeUserCapability(
                'group-1',
                'member-user',
                { id: 'owner-user', roles: [] } as any,
            ),
        ).resolves.toBeUndefined();

        expect(eogModel.updateOne).toHaveBeenCalled();
    });
});
