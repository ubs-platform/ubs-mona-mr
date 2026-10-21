/// <reference types="jest" />
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EntityOwnership, EntityOwnershipGroup } from '@ubs-platform/users-entity-mongo';
import { EntityOwnershipDTO } from '@ubs-platform/users-common';
import { EntityOwnershipService } from './entity-ownership.service';
import { EntityOwnershipMapper } from '../mapper/entity-ownership.mapper';
import { UserService } from './user.service';

describe('Acknowledged team ownership', () => {
    const model = { updateOne: jest.fn(), findOne: jest.fn() };
    let service: EntityOwnershipService;
    const input: EntityOwnershipDTO = {
        entityGroup: 'POSTRAL', entityName: 'ACCOUNT', entityId: 'account', entityOwnershipGroupId: 'team',
        userCapabilities: [], overriderRoles: ['ADMIN'],
    };

    beforeEach(async () => {
        jest.resetAllMocks();
        model.findOne.mockReturnValue({ exec: async () => input });
        const module = await Test.createTestingModule({ providers: [
            EntityOwnershipService,
            { provide: getModelToken(EntityOwnership.name), useValue: model },
            { provide: getModelToken(EntityOwnershipGroup.name), useValue: {} },
            { provide: EntityOwnershipMapper, useValue: {} },
            { provide: UserService, useValue: {} },
        ] }).compile();
        service = module.get(EntityOwnershipService);
    });

    it('atomically inserts only missing ownership and acknowledges an existing identical team', async () => {
        await service.ensureTeamOwnership(input);
        await service.ensureTeamOwnership(input);
        expect(model.updateOne).toHaveBeenCalledWith(
            { entityGroup: 'POSTRAL', entityName: 'ACCOUNT', entityId: 'account' },
            { $setOnInsert: input }, { upsert: true },
        );
    });

    it('never overwrites a different team or personal capabilities', async () => {
        model.findOne.mockReturnValueOnce({ exec: async () => ({ ...input, entityOwnershipGroupId: 'another-team' }) });
        await expect(service.ensureTeamOwnership(input)).rejects.toThrow('different owner');
        model.findOne.mockReturnValueOnce({ exec: async () => ({ ...input, userCapabilities: [{ userId: 'person' }] }) });
        await expect(service.ensureTeamOwnership(input)).rejects.toThrow('different owner');
    });

    it('recovers a duplicate upsert race but propagates other database errors', async () => {
        model.updateOne.mockRejectedValueOnce({ code: 11000 });
        await service.ensureTeamOwnership(input);
        model.updateOne.mockRejectedValueOnce(new Error('offline'));
        await expect(service.ensureTeamOwnership(input)).rejects.toThrow('offline');
    });
});
