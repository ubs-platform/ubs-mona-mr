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
            updateOne: jest.fn(),
        };
        eogInvitationModel = {};
        mapper = {
            toDto: jest.fn(),
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
