/// <reference types="jest" />
import { UBSUsersErrorConsts } from '@ubs-platform/users-common';
import { CryptoOp } from '../util/crypto-op';
import { OAuthIdentity } from '../oauth/oauth-provider';
import { OAuthService } from './oauth.service';

const identity: OAuthIdentity = {
    provider: 'google',
    subject: 'g-1',
    email: 'ali@example.com',
    emailVerified: true,
    name: 'Ali',
    surname: 'Veli',
};

function doc<T extends object>(fields: T) {
    return {
        ...fields,
        save: jest.fn(),
        deleteOne: jest.fn(),
    } as T & { save: jest.Mock; deleteOne: jest.Mock };
}

describe('OAuthService', () => {
    let userModel: any;
    let linkModel: any;
    let sessionModel: any;
    let provider: { name: string; verify: jest.Mock };
    let userService: any;
    let authService: any;
    let service: OAuthService;

    beforeEach(() => {
        userModel = {
            findById: jest.fn(),
            findOne: jest.fn().mockResolvedValue(null),
            exists: jest.fn().mockResolvedValue(null),
        };
        linkModel = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
        };
        sessionModel = {
            create: jest.fn(async (fields: any) =>
                doc({ _id: 'session-1', linkAttempts: 0, ...fields }),
            ),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
        };
        provider = {
            name: 'google',
            verify: jest.fn().mockResolvedValue(identity),
        };
        userService = { saveNewUser: jest.fn() };
        authService = {
            issueToken: jest.fn((userId: any) => ({ token: `token-${userId}` })),
        };
        service = new OAuthService(
            userModel,
            linkModel,
            sessionModel,
            { find: (name: string) => (name === 'google' ? provider : undefined) } as any,
            userService,
            authService,
        );
    });

    describe('login', () => {
        it('logs in a linked account', async () => {
            const link = doc({ userId: 'u1' });
            linkModel.findOne.mockResolvedValue(link);
            userModel.findById.mockResolvedValue({ _id: 'u1', active: true });

            const result = await service.login('google', 'cred');

            expect(result).toEqual({
                status: 'LOGGED_IN',
                provider: 'google',
                token: 'token-u1',
            });
            expect(link.save).toHaveBeenCalled();
            expect(sessionModel.create).not.toHaveBeenCalled();
        });

        it('refuses a linked account whose user is suspended', async () => {
            linkModel.findOne.mockResolvedValue(doc({ userId: 'u1' }));
            userModel.findById.mockResolvedValue({
                _id: 'u1',
                active: true,
                suspended: true,
            });

            await expect(service.login('google', 'cred')).rejects.toMatchObject({
                key: UBSUsersErrorConsts.USER_INACTIVE,
            });
        });

        it('asks for a password when the e-mail already has a user', async () => {
            userModel.findOne.mockResolvedValue({ _id: 'u2' });

            const result = await service.login('google', 'cred');

            expect(result.status).toBe('LINK_REQUIRED');
            expect(result.sessionKey).toBe('session-1');
            expect(result.token).toBeUndefined();
            expect(sessionModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ existingUserId: 'u2', subject: 'g-1' }),
            );
        });

        it('starts a registration for an unknown e-mail', async () => {
            const result = await service.login('google', 'cred');

            expect(result.status).toBe('REGISTER_REQUIRED');
            expect(result.prefill).toMatchObject({
                email: 'ali@example.com',
                name: 'Ali',
                surname: 'Veli',
                usernameSuggestion: 'ali',
            });
        });

        it('rejects an unverified e-mail', async () => {
            provider.verify.mockResolvedValue({ ...identity, emailVerified: false });

            await expect(service.login('google', 'cred')).rejects.toMatchObject({
                key: UBSUsersErrorConsts.OAUTH_EMAIL_NOT_VERIFIED,
            });
            expect(sessionModel.create).not.toHaveBeenCalled();
        });

        it('reports a credential the provider rejects', async () => {
            jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            provider.verify.mockRejectedValue(new Error('bad signature'));

            await expect(service.login('google', 'cred')).rejects.toMatchObject({
                key: UBSUsersErrorConsts.OAUTH_INVALID_CREDENTIAL,
            });
        });

        it('rejects an unknown provider', async () => {
            await expect(service.login('github', 'cred')).rejects.toMatchObject({
                key: UBSUsersErrorConsts.OAUTH_PROVIDER_NOTFOUND,
            });
        });
    });

    describe('completeRegistration', () => {
        const form = {
            username: 'ali',
            password: 'secret',
            name: 'Ali',
            surname: 'Veli',
        };

        it('creates an active user with the session e-mail and links it', async () => {
            const session = doc({
                _id: 'session-1',
                provider: 'google',
                subject: 'g-1',
                email: 'ali@example.com',
            });
            sessionModel.findOne.mockResolvedValue(session);
            userService.saveNewUser.mockResolvedValue({ id: 'u3' });

            const result = await service.completeRegistration('session-1', form);

            expect(userService.saveNewUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    primaryEmail: 'ali@example.com',
                    active: true,
                    password: 'secret',
                }),
            );
            expect(linkModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'u3', subject: 'g-1' }),
            );
            expect(session.deleteOne).toHaveBeenCalled();
            expect(result.token).toBe('token-u3');
        });

        it('requires a password', async () => {
            sessionModel.findOne.mockResolvedValue(doc({ email: 'ali@example.com' }));

            await expect(
                service.completeRegistration('session-1', { ...form, password: '' }),
            ).rejects.toMatchObject({ key: UBSUsersErrorConsts.EMPTY_DATA });
            expect(userService.saveNewUser).not.toHaveBeenCalled();
        });

        it('does not register through a link session', async () => {
            sessionModel.findOne.mockResolvedValue(
                doc({ email: 'ali@example.com', existingUserId: 'u2' }),
            );

            await expect(
                service.completeRegistration('session-1', form),
            ).rejects.toMatchObject({
                key: UBSUsersErrorConsts.OAUTH_SESSION_NOTFOUND,
            });
        });
    });

    describe('linkWithPassword', () => {
        let user: any;

        beforeEach(async () => {
            user = {
                _id: 'u2',
                active: true,
                passwordEncyripted: await CryptoOp.encryptPassword('right'),
            };
            userModel.findById.mockResolvedValue(user);
        });

        function session(linkAttempts: number) {
            return doc({
                _id: 'session-1',
                provider: 'google',
                subject: 'g-1',
                email: 'ali@example.com',
                existingUserId: 'u2',
                linkAttempts,
            });
        }

        it('links and logs in with the right password', async () => {
            const s = session(1);
            sessionModel.findOneAndUpdate.mockResolvedValue(s);

            const result = await service.linkWithPassword('session-1', 'right');

            expect(linkModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'u2', subject: 'g-1' }),
            );
            expect(s.deleteOne).toHaveBeenCalled();
            expect(result.token).toBe('token-u2');
        });

        it('rejects a wrong password without linking', async () => {
            sessionModel.findOneAndUpdate.mockResolvedValue(session(1));

            await expect(
                service.linkWithPassword('session-1', 'wrong'),
            ).rejects.toMatchObject({
                key: UBSUsersErrorConsts.AUTHENTICATION_FAIL,
            });
            expect(linkModel.create).not.toHaveBeenCalled();
        });

        it('ends the session after too many attempts', async () => {
            const s = session(6);
            sessionModel.findOneAndUpdate.mockResolvedValue(s);

            await expect(
                service.linkWithPassword('session-1', 'right'),
            ).rejects.toMatchObject({
                key: UBSUsersErrorConsts.OAUTH_TOO_MANY_ATTEMPTS,
            });
            expect(s.deleteOne).toHaveBeenCalled();
            expect(linkModel.create).not.toHaveBeenCalled();
        });
    });

    describe('linkToUser', () => {
        it('refuses a provider account linked to another user', async () => {
            linkModel.findOne.mockResolvedValue({ userId: 'other' });

            await expect(
                service.linkToUser('u1', 'google', 'cred'),
            ).rejects.toMatchObject({
                key: UBSUsersErrorConsts.OAUTH_ALREADY_LINKED,
            });
            expect(linkModel.create).not.toHaveBeenCalled();
        });
    });
});
