import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    ErrorInformations,
    OAuthCompleteRegistrationDTO,
    OAuthLinkDTO,
    OAuthLoginResultDTO,
    OAuthPrefillDTO,
    UBSUsersErrorConsts,
} from '@ubs-platform/users-common';
import {
    OAuthLoginSession,
    User,
    UserOAuthLink,
} from '@ubs-platform/users-entity-mongo';
import { OAuthProviderRegistry } from '../oauth/oauth-provider-registry';
import { OAuthIdentity } from '../oauth/oauth-provider';
import { CryptoOp } from '../util/crypto-op';
import { AuthService } from './auth.service';
import { UserService } from './user.service';

const SESSION_TTL_MS = 15 * 60 * 1000;
const MAX_LINK_ATTEMPTS = 5;

/**
 * Sign-in with external identity providers.
 *
 * - A linked provider account logs in directly.
 * - An unknown verified e-mail starts a registration session; the user picks
 *   a username and password, and the account is created active (the provider
 *   already verified the e-mail).
 * - A verified e-mail that a local user already owns starts a link session;
 *   the user must confirm with their password before the link is made.
 */
@Injectable()
export class OAuthService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(UserOAuthLink.name)
        private linkModel: Model<UserOAuthLink>,
        @InjectModel(OAuthLoginSession.name)
        private sessionModel: Model<OAuthLoginSession>,
        private providers: OAuthProviderRegistry,
        private userService: UserService,
        private authService: AuthService,
    ) {}

    listProviders() {
        return this.providers.list().map((p) => p.publicInfo());
    }

    async login(
        providerName: string,
        credential: string,
    ): Promise<OAuthLoginResultDTO> {
        const identity = await this.verify(providerName, credential);

        const link = await this.linkModel.findOne({
            provider: identity.provider,
            subject: identity.subject,
        });
        if (link) {
            const user = await this.userModel.findById(link.userId);
            if (user) {
                this.assertCanLogin(user);
                link.lastLoginAt = new Date();
                await link.save();
                return await this.loggedIn(identity.provider, user._id);
            }
            // The user was deleted; drop the orphaned link and continue.
            await link.deleteOne();
        }

        if (!identity.email || !identity.emailVerified) {
            throw new ErrorInformations(
                UBSUsersErrorConsts.OAUTH_EMAIL_NOT_VERIFIED,
                'The provider did not return a verified e-mail address.',
            );
        }

        const existing = await this.userModel.findOne({
            primaryEmail: identity.email,
        });
        const session = await this.sessionModel.create({
            provider: identity.provider,
            subject: identity.subject,
            email: identity.email,
            name: identity.name,
            surname: identity.surname,
            picture: identity.picture,
            existingUserId: existing?._id?.toString(),
            expireAfter: new Date(Date.now() + SESSION_TTL_MS),
        });
        return this.pending(session);
    }

    /** Lets the frontend restore a pending step, for example after a reload. */
    async getSession(key: string): Promise<OAuthLoginResultDTO> {
        return this.pending(await this.findSession(key));
    }

    async completeRegistration(
        key: string,
        dto: OAuthCompleteRegistrationDTO,
    ): Promise<OAuthLoginResultDTO> {
        const session = await this.findSession(key);
        if (session.existingUserId) {
            throw this.sessionNotFound();
        }
        const username = dto?.username?.trim();
        if (
            !username ||
            /\s/.test(username) ||
            !dto.password ||
            !dto.name?.trim() ||
            !dto.surname?.trim()
        ) {
            throw new ErrorInformations(
                UBSUsersErrorConsts.EMPTY_DATA,
                'Username, password, name and surname are required; the username cannot contain spaces.',
            );
        }

        // Rejects a username or e-mail taken since the session started.
        const user = await this.userService.saveNewUser({
            username,
            password: dto.password,
            primaryEmail: session.email,
            name: dto.name.trim(),
            surname: dto.surname.trim(),
            localeCode: dto.localeCode ?? '',
            active: true,
            roles: [],
        });
        await this.createLink(user.id, session);
        await session.deleteOne();
        return await this.loggedIn(session.provider, user.id);
    }

    async linkWithPassword(
        key: string,
        password: string,
    ): Promise<OAuthLoginResultDTO> {
        // Count the attempt before checking the password so parallel requests
        // cannot exceed the limit.
        const session = await this.sessionModel.findOneAndUpdate(
            {
                _id: key,
                existingUserId: { $exists: true },
                expireAfter: { $gt: new Date() },
            },
            { $inc: { linkAttempts: 1 } },
            { new: true },
        );
        if (!session) {
            throw this.sessionNotFound();
        }
        if (session.linkAttempts > MAX_LINK_ATTEMPTS) {
            await session.deleteOne();
            throw new ErrorInformations(
                UBSUsersErrorConsts.OAUTH_TOO_MANY_ATTEMPTS,
                'Too many wrong passwords; sign in with the provider again.',
            );
        }

        const user = await this.userModel.findById(session.existingUserId);
        const passwordMatches =
            !!user?.passwordEncyripted &&
            !!password &&
            (await CryptoOp.checkPassword(password, user.passwordEncyripted));
        if (!user || !passwordMatches) {
            throw new ErrorInformations(
                UBSUsersErrorConsts.AUTHENTICATION_FAIL,
                'Password does not match',
            );
        }
        this.assertCanLogin(user);

        await this.createLink(user._id, session);
        await session.deleteOne();
        return await this.loggedIn(session.provider, user._id);
    }

    async listLinks(userId: string): Promise<OAuthLinkDTO[]> {
        const links = await this.linkModel
            .find({ userId: String(userId) })
            .sort({ linkedAt: 1 });
        return links.map((l) => ({
            id: l._id.toString(),
            provider: l.provider,
            email: l.email,
            linkedAt: l.linkedAt,
            lastLoginAt: l.lastLoginAt,
        }));
    }

    /** Links a provider account to an already signed-in user. */
    async linkToUser(
        userId: string,
        providerName: string,
        credential: string,
    ): Promise<OAuthLinkDTO[]> {
        const identity = await this.verify(providerName, credential);
        const existing = await this.linkModel.findOne({
            provider: identity.provider,
            subject: identity.subject,
        });
        if (existing) {
            if (existing.userId !== String(userId)) {
                throw new ErrorInformations(
                    UBSUsersErrorConsts.OAUTH_ALREADY_LINKED,
                    'This provider account is linked to another user.',
                );
            }
        } else {
            await this.createLink(userId, identity);
        }
        return this.listLinks(userId);
    }

    async unlink(userId: string, linkId: string): Promise<OAuthLinkDTO[]> {
        const link = await this.linkModel.findOne({
            _id: linkId,
            userId: String(userId),
        });
        if (!link) {
            throw new ErrorInformations(
                UBSUsersErrorConsts.OAUTH_LINK_NOTFOUND,
                'Link not found.',
            );
        }
        const user = await this.userModel.findById(userId);
        const otherLinks = await this.linkModel.countDocuments({
            userId: String(userId),
            _id: { $ne: link._id },
        });
        if (!user?.passwordEncyripted && otherLinks === 0) {
            throw new ErrorInformations(
                UBSUsersErrorConsts.OAUTH_LAST_LOGIN_METHOD,
                'Set a password before removing your only sign-in method.',
            );
        }
        await link.deleteOne();
        return this.listLinks(userId);
    }

    private async verify(
        providerName: string,
        credential: string,
    ): Promise<OAuthIdentity> {
        const provider = this.providers.find(providerName);
        if (!provider) {
            throw new ErrorInformations(
                UBSUsersErrorConsts.OAUTH_PROVIDER_NOTFOUND,
                'OAuth provider is not available.',
            );
        }
        if (!credential) {
            throw this.invalidCredential();
        }
        try {
            return await provider.verify({ credential });
        } catch (error) {
            console.warn(`OAuth ${providerName} verification failed`, error);
            throw this.invalidCredential();
        }
    }

    private async findSession(key: string) {
        const session = await this.sessionModel.findOne({
            _id: key,
            expireAfter: { $gt: new Date() },
        });
        if (!session) {
            throw this.sessionNotFound();
        }
        return session;
    }

    private async createLink(
        userId: any,
        identity: Pick<OAuthIdentity, 'provider' | 'subject' | 'email'>,
    ) {
        await this.linkModel.create({
            userId: String(userId),
            provider: identity.provider,
            subject: identity.subject,
            email: identity.email,
            linkedAt: new Date(),
            lastLoginAt: new Date(),
        });
    }

    private assertCanLogin(user: User) {
        if (!user.active || user.suspended) {
            throw new ErrorInformations(
                UBSUsersErrorConsts.USER_INACTIVE,
                'User is not active or is suspended.',
            );
        }
    }

    private async loggedIn(
        provider: string,
        userId: any,
    ): Promise<OAuthLoginResultDTO> {
        return {
            status: 'LOGGED_IN',
            provider,
            token: (await this.authService.issueToken(userId)).token,
        };
    }

    private async pending(
        session: OAuthLoginSession,
    ): Promise<OAuthLoginResultDTO> {
        const prefill: OAuthPrefillDTO = {
            email: session.email,
            name: session.name,
            surname: session.surname,
            picture: session.picture,
        };
        if (!session.existingUserId) {
            prefill.usernameSuggestion = await this.suggestUsername(
                session.email,
            );
        }
        return {
            status: session.existingUserId
                ? 'LINK_REQUIRED'
                : 'REGISTER_REQUIRED',
            provider: session.provider,
            sessionKey: session._id,
            prefill,
        };
    }

    /**
     * Matches the frontend registration rules: starts with a letter, only
     * letters, digits, `.` and `_`, at most 15 characters.
     */
    private async suggestUsername(email: string): Promise<string> {
        const cleaned = email
            .split('@')[0]
            .toLowerCase()
            .replace(/[^a-z0-9._]/g, '')
            .replace(/^[^a-z]+/, '');
        // Leaves room for a four-digit suffix.
        const base = (cleaned || 'user').slice(0, 11);
        let candidate = base;
        for (let i = 0; i < 10; i++) {
            if (!(await this.userModel.exists({ username: candidate }))) {
                return candidate;
            }
            candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
        }
        return candidate;
    }

    private sessionNotFound() {
        return new ErrorInformations(
            UBSUsersErrorConsts.OAUTH_SESSION_NOTFOUND,
            'Sign-in session expired; sign in with the provider again.',
        );
    }

    private invalidCredential() {
        return new ErrorInformations(
            UBSUsersErrorConsts.OAUTH_INVALID_CREDENTIAL,
            'The provider credential could not be verified.',
        );
    }
}
