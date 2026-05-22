import { EntityOwnershipDTO } from '@ubs-platform/users-common';
import { EntityOwnership } from '@ubs-platform/users-entity-mongo';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EntityOwnershipMapper {
    constructor() {}

    toDto(entityOwnership: EntityOwnership) {
        return {
            entityGroup: entityOwnership.entityGroup,
            entityId: entityOwnership.entityId,
            entityName: entityOwnership.entityName,
            overriderRoles: entityOwnership.overriderRoles?.map((a) => a),
            userCapabilities: entityOwnership.userCapabilities.map((a) => ({
                userId: a.userId,
                capability: a.capability,
            })),
            entityOwnershipGroupId: entityOwnership.entityOwnershipGroupId,
        } as EntityOwnershipDTO;
    }

    toEntity(entityOwnership: EntityOwnershipDTO) {
        return {
            entityGroup: entityOwnership.entityGroup,
            entityId: entityOwnership.entityId,
            entityName: entityOwnership.entityName,
            overriderRoles: entityOwnership.overriderRoles,
            entityOwnershipGroupId: entityOwnership.entityOwnershipGroupId,
            userCapabilities: entityOwnership.userCapabilities.map((a) => {
                return {
                    userId: a.userId,
                    capability: a.capability,
                };
            }),
        } as any;
    }

    toEntityEditWithMembers(
        existingEntity: EntityOwnership,
        entityOwnership: EntityOwnershipDTO,
    ) {
        existingEntity.entityOwnershipGroupId =
            entityOwnership.entityOwnershipGroupId;
        existingEntity.userCapabilities = entityOwnership.userCapabilities;
        existingEntity.entityOwnershipGroupId =
            entityOwnership.entityOwnershipGroupId;
        existingEntity.userCapabilities = entityOwnership.userCapabilities.map(
            (a) => ({
                userId: a.userId,
                capability: a.capability,
            }),
        );
        return existingEntity;
    }

    toEntityEdit(
        existingEntity: EntityOwnership,
        entityOwnership: EntityOwnershipDTO,
    ) {
        existingEntity.entityOwnershipGroupId =
            entityOwnership.entityOwnershipGroupId;
        existingEntity.userCapabilities = entityOwnership.userCapabilities;
        existingEntity.entityOwnershipGroupId =
            entityOwnership.entityOwnershipGroupId;
        return existingEntity;
    }
}
