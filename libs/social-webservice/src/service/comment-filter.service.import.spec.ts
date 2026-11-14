// Jest bu repoda @nestjs/* ESM paketlerini yükleyemiyor; framework bağımlılıklarını sahteliyoruz.
jest.mock('@nestjs/common', () => {
    class BadRequestException extends Error {
        constructor(public response: unknown) {
            super('bad-request');
        }
    }
    return {
        Injectable: () => () => undefined,
        BadRequestException,
        NotFoundException: class NotFoundException extends Error {},
    };
});
jest.mock('@nestjs/mongoose', () => ({ InjectModel: () => () => undefined }));
jest.mock(
    '@ubs-platform/social-entity-mongo',
    () => ({ CommentFilterPattern: class {} }),
    { virtual: true },
);
jest.mock('@ubs-platform/social-common', () => ({}), { virtual: true });

import { CommentFilterService } from './comment-filter.service';

const ok = { pattern: 'abc', type: 'STRING', flag: 'f', action: 'FLAG_ONLY' };

function setup(insertFails = false) {
    const model: any = {
        insertMany: jest.fn().mockImplementation(async () => {
            if (insertFails) throw new Error('db down');
        }),
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 3 }),
        updateMany: jest.fn().mockResolvedValue({}),
    };
    return { svc: new CommentFilterService(model), model };
}

describe('CommentFilterService.importReplace', () => {
    it('does not touch the DB when any item is invalid', async () => {
        const { svc, model } = setup();
        await expect(
            svc.importReplace([ok, { ...ok, type: 'REGEX', pattern: '(' }]),
        ).rejects.toMatchObject({
            response: {
                message: 'import-invalid',
                errors: [{ index: 1, code: 'regex-invalid' }],
            },
        });
        expect(model.insertMany).not.toHaveBeenCalled();
        expect(model.deleteMany).not.toHaveBeenCalled();
    });

    it('inserts the new batch, then removes everything else', async () => {
        const { svc, model } = setup();
        const res = await svc.importReplace({
            version: 1,
            patterns: [ok, { ...ok, action: 'DROP', flag: 'ignored' }],
        });
        expect(res).toEqual({ imported: 2, removed: 3 });

        const inserted = model.insertMany.mock.calls[0][0];
        const batch = inserted[0].importBatchId;
        expect(batch).toBeTruthy();
        expect(inserted[1].flag).toBeUndefined(); // DROP'ta flag saklanmaz
        expect(model.deleteMany).toHaveBeenCalledWith({ importBatchId: { $ne: batch } });
        expect(model.updateMany).toHaveBeenCalledWith(
            { importBatchId: batch },
            { $unset: { importBatchId: 1 } },
        );
        // silme eklemeden sonra
        expect(model.insertMany.mock.invocationCallOrder[0]).toBeLessThan(
            model.deleteMany.mock.invocationCallOrder[0],
        );
    });

    it('rolls back only the new batch when insert fails, keeping old patterns', async () => {
        const { svc, model } = setup(true);
        await expect(svc.importReplace([ok])).rejects.toThrow('db down');
        expect(model.deleteMany).toHaveBeenCalledTimes(1);
        const filter = model.deleteMany.mock.calls[0][0];
        expect(typeof filter.importBatchId).toBe('string');
        expect(model.updateMany).not.toHaveBeenCalled();
    });
});
