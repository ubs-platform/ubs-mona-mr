import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { UserIntercept } from '@ubs-platform/users-microservice-helper';
import { MICROSERVICE_CLIENT } from '@ubs-platform/microservice-setup-util';
import { of } from 'rxjs';
import { FileService } from '../service/file.service';
import { ImageFileController } from './file.controller';

jest.mock('../service/file.service', () => ({
    FileService: class FileService {},
}));
jest.mock('@ubs-platform/microservice-setup-util', () => ({
    MICROSERVICE_CLIENT: 'MICROSERVICE_CLIENT',
}));
jest.mock('@ubs-platform/users-microservice-helper', () => {
    const { createParamDecorator } = jest.requireActual('@nestjs/common');
    return {
        UserIntercept: class UserIntercept {},
        JwtAuthGuard: class JwtAuthGuard {},
        CurrentUser: createParamDecorator(() => undefined),
    };
});

describe('File content endpoint', () => {
    let app: NestFastifyApplication;
    const files = { findByName: jest.fn() };
    const client = { send: jest.fn() };

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [ImageFileController],
            providers: [
                { provide: FileService, useValue: files },
                { provide: MICROSERVICE_CLIENT, useValue: client },
            ],
        })
            .overrideGuard(UserIntercept)
            .useValue({ canActivate: () => true })
            .compile();
        app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
        await app.init();
        await app.getHttpAdapter().getInstance().ready();
    });

    beforeEach(() => jest.resetAllMocks());
    afterAll(async () => { await app?.close(); });

    it('returns 404 without a placeholder redirect for a missing profile photo', async () => {
        files.findByName.mockResolvedValue(null);
        const response = await app.inject({
            method: 'GET', url: '/file/PROFILE_PHOTO/user-id?width=96',
        });
        expect(response.statusCode).toBe(404);
        expect(response.headers.location).toBeUndefined();
        expect(response.body).toBe('File not found');
        expect(files.findByName).toHaveBeenCalledWith('PROFILE_PHOTO', 'user-id', '96');
        expect(client.send).not.toHaveBeenCalled();
    });

    it('still returns the existing file with its content type', async () => {
        files.findByName.mockResolvedValue({
            mimetype: 'image/png', file: Buffer.from('photo'), needAuthorizationAtView: false,
        });
        const response = await app.inject({ method: 'GET', url: '/file/PROFILE_PHOTO/user-id' });
        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toBe('image/png');
        expect(response.body).toBe('photo');
    });

    it('still rejects unauthorized reads without returning file content', async () => {
        files.findByName.mockResolvedValue({
            mimetype: 'image/png', file: Buffer.from('private-photo'), needAuthorizationAtView: true,
        });
        client.send.mockReturnValue(of(false));
        const response = await app.inject({ method: 'GET', url: '/file/PRIVATE/file-id' });
        expect(response.statusCode).toBe(403);
        expect(response.body).toBe('Unauthorized to view this file');
        expect(response.body).not.toContain('private-photo');
    });

    it('still returns protected file content when access is allowed', async () => {
        files.findByName.mockResolvedValue({
            mimetype: 'image/png', file: Buffer.from('allowed-photo'), needAuthorizationAtView: true,
        });
        client.send.mockReturnValue(of(true));
        const response = await app.inject({ method: 'GET', url: '/file/PRIVATE/file-id' });
        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('allowed-photo');
        expect(client.send).toHaveBeenCalledWith('file-get-PRIVATE', {
            userId: undefined, objectId: 'file-id', roles: undefined,
        });
    });
});
