/// <reference types="jest" />
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { EntityOwnership, EntityOwnershipGroup } from '@ubs-platform/users-entity-mongo';
import { Capability } from '@ubs-platform/users-common';
import { EntityOwnershipService } from './entity-ownership.service';
import { EntityOwnershipMapper } from '../mapper/entity-ownership.mapper';
import { UserService } from './user.service';

const GROUP_ID = '64b7f0c2a1b2c3d4e5f60718';
const chain = (value: unknown) => ({ lean: () => chain(value), exec: async () => value });

describe('EntityOwnershipService search v2', () => {
    const eoModel = { find: jest.fn(), findOne: jest.fn(), exists: jest.fn(), updateOne: jest.fn() };
    const eogModel = { find: jest.fn(), findById: jest.fn() };
    const userService = { findUserAuthBackend: jest.fn() };
    let service: EntityOwnershipService;

    beforeEach(async () => {
        jest.resetAllMocks();
        eoModel.find.mockReturnValue(chain([]));
        eogModel.find.mockReturnValue(chain([]));
        eogModel.findById.mockReturnValue(chain(null));
        const module = await Test.createTestingModule({ providers: [
            EntityOwnershipService,
            { provide: getModelToken(EntityOwnership.name), useValue: eoModel },
            { provide: getModelToken(EntityOwnershipGroup.name), useValue: eogModel },
            { provide: EntityOwnershipMapper, useValue: { toDto: (a: unknown) => a } },
            { provide: UserService, useValue: userService },
        ] }).compile();
        service = module.get(EntityOwnershipService);
    });

    describe('required fields', () => {
        it('rejects list searches without an entity type', async () => {
            await expect(service.search({ entityGroup: 'POSTRAL' } as never)).rejects.toThrow(BadRequestException);
            await expect(service.searchV2({ userId: 'u' })).rejects.toThrow('entityName');
        });

        it('rejects id searches without a user or group scope', async () => {
            await expect(service.searchEntityIdsV2({ entityGroup: 'G', entityName: 'N' })).rejects.toThrow(BadRequestException);
            await expect(service.searchEntityIdsByUser({ entityGroup: 'G', entityName: 'N', entityOwnershipGroupId: GROUP_ID }))
                .rejects.toThrow('userId');
        });

        it('rejects a capability check without an entity id instead of picking an arbitrary entity', async () => {
            await expect(service.findInsertedUserCapability({ entityGroup: 'G', entityName: 'N', userId: 'u' }, true))
                .rejects.toThrow('entityId');
            expect(eoModel.findOne).not.toHaveBeenCalled();
        });
    });

    describe('filter', () => {
        it('matches group membership and capability on the same member and entity type', async () => {
            await service.searchEntityIdsV2({
                entityGroup: 'POSTRAL', entityName: 'ACCOUNT', userId: 'u',
                requestedCapabilities: [[Capability.OWNER], [Capability.EDIT]],
            });
            expect(eogModel.find.mock.calls[0][0]).toEqual({
                userCapabilities: { $elemMatch: {
                    userId: 'u',
                    entityCapabilities: { $elemMatch: {
                        entityGroup: 'POSTRAL', entityName: 'ACCOUNT',
                        $or: [{ capabilities: { $all: [Capability.OWNER] } }, { capabilities: { $all: [Capability.EDIT] } }],
                    } },
                } },
            });
        });

        it('requires both the group and the user when both are given', async () => {
            eogModel.find.mockReturnValue(chain([{ _id: GROUP_ID }]));
            await service.searchEntityIdsByUser({ entityGroup: 'G', entityName: 'N', userId: 'u', entityOwnershipGroupId: GROUP_ID });
            expect(eogModel.find.mock.calls[0][0]._id).toBe(GROUP_ID);
            expect(eoModel.find.mock.calls[0][0]).toEqual({
                entityGroup: 'G', entityName: 'N', entityId: { $ne: null }, entityOwnershipGroupId: GROUP_ID,
                $or: [
                    { userCapabilities: { $elemMatch: { userId: 'u' } } },
                    { entityOwnershipGroupId: { $in: [GROUP_ID] } },
                ],
            });
        });

        it('limits a group-only search to that group', async () => {
            eoModel.find.mockReturnValue(chain([{ entityId: 'a' }, { entityId: 'b' }]));
            const ids = await service.searchByEntityIdsByEogroup({ entityGroup: 'G', entityName: 'N', entityOwnershipGroupId: GROUP_ID });
            expect(ids).toEqual(['a', 'b']);
            expect(eoModel.find.mock.calls[0][0]).toEqual({
                entityGroup: 'G', entityName: 'N', entityId: { $ne: null }, entityOwnershipGroupId: GROUP_ID,
            });
            expect(eogModel.find).not.toHaveBeenCalled();
        });
    });

    describe('capability check', () => {
        const ownership = {
            entityGroup: 'G', entityName: 'N', entityId: 'e', entityOwnershipGroupId: GROUP_ID,
            overriderRoles: ['MODERATOR'], userCapabilities: [{ userId: 'other', capabilities: [Capability.OWNER] }],
        };
        const check = { entityGroup: 'G', entityName: 'N', entityId: 'e', userId: 'u', requestedCapabilities: [[Capability.OWNER]] };

        beforeEach(() => eoModel.findOne.mockReturnValue(chain(ownership)));

        it('does not borrow another member capability or another entity type from the group', async () => {
            eogModel.findById.mockReturnValue(chain({ userCapabilities: [
                { userId: 'other', entityCapabilities: [{ entityGroup: 'G', entityName: 'N', capabilities: [Capability.OWNER] }] },
                { userId: 'u', entityCapabilities: [
                    { entityGroup: 'G', entityName: 'N', capabilities: [Capability.VIEW] },
                    { entityGroup: 'G', entityName: 'TAX', capabilities: [Capability.OWNER] },
                ] },
            ] }));
            userService.findUserAuthBackend.mockResolvedValue({ id: 'u', roles: ['USER'] });
            expect(await service.findInsertedUserCapability(check, true)).toBeNull();
        });

        it('returns the group capability of the same member', async () => {
            eogModel.findById.mockReturnValue(chain({ userCapabilities: [
                { userId: 'u', entityCapabilities: [{ entityGroup: 'G', entityName: 'N', capabilities: [Capability.OWNER] }] },
            ] }));
            expect(await service.findInsertedUserCapability(check, false)).toEqual({ userId: 'u', capabilities: [Capability.OWNER] });
        });

        it('lets an override role through only when its fixed capabilities satisfy the request', async () => {
            userService.findUserAuthBackend.mockResolvedValue({ id: 'u', roles: ['MODERATOR'] });
            expect(await service.findInsertedUserCapability(check, true)).toBeNull();
            expect(await service.findInsertedUserCapability({ ...check, requestedCapabilities: [[Capability.OWNER], [Capability.EDIT]] }, true))
                .toEqual({ userId: 'u', capabilities: [Capability.VIEW, Capability.ADD, Capability.EDIT, Capability.DELETE] });
        });

        it('rejects an entity that belongs to a different group than requested', async () => {
            expect(await service.findUserCapabilityV2({ ...check, entityOwnershipGroupId: 'another' }, { roleOverride: true })).toBeNull();
        });
    });

    it('adds a direct capability even when the user already has access through a group', async () => {
        eoModel.updateOne.mockResolvedValueOnce({ matchedCount: 0 }).mockResolvedValueOnce({ matchedCount: 1 });
        await service.insertUserCapability({ entityGroup: 'G', entityName: 'N', entityId: 'e', userId: 'u', capabilities: [Capability.EDIT] });
        expect(eoModel.updateOne).toHaveBeenLastCalledWith(
            { entityGroup: 'G', entityName: 'N', entityId: 'e', 'userCapabilities.userId': { $ne: 'u' } },
            { $push: { userCapabilities: { userId: 'u', capabilities: [Capability.EDIT] } } },
        );
    });
});
