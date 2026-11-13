export const ModeratorRole = 'UBS-SOCIAL:MODERATOR';

import { matchRolesOrAdm } from '@ubs-platform/users-roles';

export function isModerator(user?: { roles?: string[] } | null): boolean {
    return !!user && matchRolesOrAdm([ModeratorRole], user.roles ?? []);
}
