// Jest bu repoda @nestjs/* ESM paketlerini yükleyemiyor (mevcut spec'ler de aynı hatayı veriyor),
// bu yüzden servisin framework bağımlılıklarını hafif sahtelerle değiştiriyoruz.
jest.mock('@nestjs/common', () => {
    class HttpEx extends Error {}
    return {
        Injectable: () => () => undefined,
        BadRequestException: class BadRequestException extends HttpEx {},
        UnauthorizedException: class UnauthorizedException extends HttpEx {},
        NotFoundException: class NotFoundException extends HttpEx {},
    };
});
jest.mock(
    '@ubs-platform/social-entity-mongo',
    () => ({ SocialComment: class {} }),
    { virtual: true },
);
jest.mock('@ubs-platform/social-common', () => ({}), { virtual: true });
jest.mock('@ubs-platform/users-common', () => ({ Capability: {} }), {
    virtual: true,
});
jest.mock('@ubs-platform/crud-base-common', () => ({}), { virtual: true });
jest.mock('@ubs-platform/crud-base-common/utils', () => ({}), { virtual: true });
jest.mock('@nestjs/mongoose', () => ({ InjectModel: () => () => undefined }));
jest.mock('@ubs-platform/crud-base', () => ({ MongooseSearchUtil: {} }));
jest.mock('@ubs-platform/users-microservice-helper', () => ({
    EntityOwnershipService: class {},
}));
jest.mock('@ubs-platform/users-roles', () => ({
    matchRolesOrAdm: (roles: string[], user: string[]) =>
        user.includes('ADMIN') || roles.some((r) => user.includes(r)),
}));
jest.mock('./comment-ability-check.service', () => ({
    CommentAbilityCheckService: class {},
}));
jest.mock('./comment-meta.service', () => ({ CommentMetaService: class {} }));
jest.mock('./comment-filter.service', () => ({ CommentFilterService: class {} }));
jest.mock('./application-social-restriction.service', () => ({
    ApplicationSocialRestrictionService: class {},
}));
jest.mock('../mapper/comment.mapper', () => ({ CommentMapper: class {} }));

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { CommentService } from './comment.service';

function setup(decision: any, parent?: any) {
    const saved: any[] = [];
    const modelCtor: any = jest.fn().mockImplementation(() => {
        const doc: any = {
            _id: 'new-id',
            save: jest.fn().mockImplementation(async () => {
                saved.push(doc);
                return doc;
            }),
        };
        return doc;
    });
    modelCtor.findById = jest.fn().mockResolvedValue(parent ?? null);

    const meta = { commentingDisabledUserIds: [] };
    const metaService: any = {
        findOrCreateNewMeta: jest.fn().mockResolvedValue(meta),
        increaseExisting: jest.fn(),
    };
    const mapper: any = {
        moveToEntity: (m: any, d: any) => {
            m.textContent = d.textContent;
        },
        toDto: jest.fn().mockImplementation(async (c: any) => ({ _id: c._id })),
    };
    const ability: any = {
        checkCommentingAbilities: jest
            .fn()
            .mockResolvedValue({ userCanComment: true }),
    };
    const filter: any = { evaluate: jest.fn().mockResolvedValue(decision) };
    const restriction: any = { restrictUser: jest.fn() };
    const svc = new CommentService(
        modelCtor,
        {} as any,
        mapper,
        metaService,
        ability,
        filter,
        restriction,
    );
    return { svc, saved, metaService, restriction, modelCtor };
}

const user: any = { id: 'u1', name: 'A', surname: 'B', roles: [] };
const dto: any = {
    entityGroup: 'G',
    mainEntityName: 'N',
    mainEntityId: '1',
    textContent: 'hello',
};
const base = { flags: [], action: 'FLAG_ONLY', penaltyPoints: 0 };

describe('CommentService.insertComment with filter', () => {
    it('FLAG_ONLY saves visible comment with flags and counts it', async () => {
        const { svc, saved, metaService } = setup({
            ...base,
            flags: ['siyasi'],
        });
        await svc.insertComment({ ...dto }, user, '1.1.1.1');
        expect(saved[0].flags).toEqual(['siyasi']);
        expect(saved[0].moderationStatus).toBeUndefined();
        expect(metaService.increaseExisting).toHaveBeenCalled();
    });

    it('DROP returns a dto but never touches the DB', async () => {
        const { svc, saved, metaService, modelCtor } = setup({
            ...base,
            action: 'DROP',
        });
        const res = await svc.insertComment({ ...dto }, user, '1.1.1.1');
        expect(res.textContent).toBe('hello');
        expect(modelCtor).not.toHaveBeenCalled();
        expect(saved).toHaveLength(0);
        expect(metaService.increaseExisting).not.toHaveBeenCalled();
    });

    it('SHADOW saves with expiry but does not touch counters', async () => {
        const { svc, saved, metaService } = setup({
            ...base,
            action: 'SHADOW',
            flags: ['x'],
        });
        await svc.insertComment({ ...dto }, user, '1.1.1.1');
        expect(saved[0].moderationStatus).toBe('SHADOW');
        expect(saved[0].shadowExpiresAt).toBeInstanceOf(Date);
        expect(metaService.increaseExisting).not.toHaveBeenCalled();
    });

    it('reply to a shadow parent becomes shadow and parent count is untouched', async () => {
        const parent = {
            moderationStatus: 'SHADOW',
            childCommentsCount: 0,
            save: jest.fn(),
        };
        const { svc, saved } = setup(base, parent);
        await svc.insertComment({ ...dto, childOfCommentId: 'p' }, user, 'ip');
        expect(saved[0].moderationStatus).toBe('SHADOW');
        expect(parent.save).not.toHaveBeenCalled();
    });

    it('REJECT_ERROR throws and saves nothing', async () => {
        const { svc, saved } = setup({ ...base, action: 'REJECT_ERROR' });
        await expect(svc.insertComment({ ...dto }, user, 'ip')).rejects.toThrow(
            BadRequestException,
        );
        expect(saved).toHaveLength(0);
    });

    it('BAN_USER restricts the user, throws and saves nothing', async () => {
        const { svc, saved, restriction } = setup({
            ...base,
            action: 'BAN_USER',
            banDurationHours: 24,
        });
        await expect(svc.insertComment({ ...dto }, user, 'ip')).rejects.toThrow(
            UnauthorizedException,
        );
        expect(saved).toHaveLength(0);
        const arg = restriction.restrictUser.mock.calls[0][0];
        expect(arg.userId).toBe('u1');
        expect(arg.restriction).toBe('COMMENT');
        expect(arg.note).not.toContain('hello');
    });
});
