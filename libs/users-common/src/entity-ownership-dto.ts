import { Capability } from "./capability";

export class UserCapabilityDTO {
    userId!: string;
    capability?: string;
    capabilities: Capability[] = [];
}

export class EntityOwnershipRemoveUserCapabilityDTO {
    userId: string;
}

export class EntityOwnershipSetGroupIdDTO {
    userId: string;
    groupId: string;
}

export class EntityOwnershipDTO {
    userCapabilities: UserCapabilityDTO[];
    entityGroup: string;
    entityName: string;
    entityId: string;
    overriderRoles: string[];
    entityOwnershipGroupId: string;
}

export class EntityOwnershipInsertCapabiltyDTO {
    entityGroup: string;
    entityName: string;
    entityId: string;
    userId: string;
    capabilities: Capability[];

}

/**
 * Tüm ownership aramalarının ortak sorgu modeli. Alanların hepsi opsiyoneldir; her servis metodu kendi ihtiyacı olan
 * alanları zorunlu kılar ve eksikse hata verir:
 * - searchV2: entityGroup, entityName
 * - searchEntityIdsV2: entityGroup, entityName, userId veya entityOwnershipGroupId
 * - findUserCapabilityV2: entityGroup, entityName, entityId, userId
 *
 * userId ve entityOwnershipGroupId birlikte verilirse ikisi de sağlanmalıdır (VE).
 * requestedCapabilities yalnızca userId ile birlikte anlamlıdır.
 */
export class EntityOwnershipUserSearchV2 {
    entityGroup?: string;
    entityName?: string;
    entityId?: string;
    requestedCapabilities?: number[][];
    userId?: string;
    entityOwnershipGroupId?: string;
}

export class EntityOwnershipUserSearch {
    entityGroup: string;
    entityName: string;
    userId?: string;
    // Todo: Sadece kişisel olarak ait olan varlıkları filtreleme özelliği için ekstra boolean alan.
    // onlyPersonal?: boolean;
    entityOwnershipGroupId?: string;
    requestedCapabilities?: number[][];

}

export class EntityOwnershipSearch {
    entityGroup: string;
    entityName: string;
    entityId?: string;
}

export class EntityOwnershipUserCheck {
    entityGroup: string;
    entityName: string;
    entityId?: string;
    requestedCapabilities?: number[][];
    userId: string;
    entityOwnershipGroupId?: string;
}

export class EntityOwnershipGroupIdCheck {
    entityGroup: string;
    entityName: string;
    entityId?: string;
    requestedCapabilities?: number[][];
    entityOwnershipGroupId: string;
}
