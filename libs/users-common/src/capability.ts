
/**
 * DİKKAT - Kendi yetkilerinizi 100'den sonraya ayarlayın
 * ATTENTION - Set your own capabilities after 100
 * 
 * Bu enum, bir kullanıcının sistemde sahip olabileceği yetenekleri tanımlar. Her yetenek, bit bayrağı olarak temsil edilir ve bu sayede birden fazla yeteneğin verimli bir şekilde saklanması ve kontrol edilmesi için bit düzeyinde işlemler kullanılabilir.
 *
 * Yetkinlikler şu şekilde tanımlanmıştır:
 * - OWNER: Kullanıcı varlığın sahibidir (1)
 * - VIEW: Kullanıcı varlığı görüntüleyebilir (2)
 * - ADD: Kullanıcı yeni varlıklar ekleyebilir (3)
 * - EDIT: Kullanıcı mevcut varlıkları düzenleyebilir (4)
 * - DELETE: Kullanıcı varlıkları silebilir (5)
 * - EOG_ADJUST_MEMBERS: Kullanıcı, Entity Ownership Group üyelerini ayarlayabilir (6)
 * - EOG_ADJUST_CAPABILITIES: Kullanıcı, Entity Ownership Group yeteneklerini ayarlayabilir (7)
 * - EOG_EDIT_METADATA: Kullanıcı, Entity Ownership Group meta verilerini düzenleyebilir (8)
 */
export enum Capability {
    OWNER = 1,
    VIEW = 2,
    ADD = 3,
    EDIT = 4,
    DELETE = 5,
    EOG_ADJUST_MEMBERS = 6,
    EOG_ADJUST_CAPABILITIES = 7,
    EOG_EDIT_METADATA = 8,
    // RESERVED_9 = 9,
    // RESERVED_10 = 10,
    // RESERVED_11 = 11,
    // RESERVED_12 = 12,
    // RESERVED_13 = 13,
    // RESERVED_14 = 14,
    // RESERVED_15 = 15,
    // RESERVED_16 = 16,
    // RESERVED_17 = 17,
    // RESERVED_18 = 18,
    // RESERVED_19 = 19,
    // RESERVED_20 = 20,
    // RESERVED_21 = 21,
    // RESERVED_22 = 22,
    // RESERVED_23 = 23,
    // RESERVED_24 = 24,
    // RESERVED_25 = 25,
    // RESERVED_26 = 26,
    // RESERVED_27 = 27,
    // RESERVED_28 = 28,
    // RESERVED_29 = 29,
    // RESERVED_30 = 30,
    // RESERVED_31 = 31,
    // RESERVED_32 = 32,
    // RESERVED_33 = 33,
    // RESERVED_34 = 34,
    // RESERVED_35 = 35,
    // RESERVED_36 = 36,
    // RESERVED_37 = 37,
    // RESERVED_38 = 38,
    // RESERVED_39 = 39,
    // RESERVED_40 = 40,
    // RESERVED_41 = 41,
    // RESERVED_42 = 42,
    // RESERVED_43 = 43,
    // RESERVED_44 = 44,
    // RESERVED_45 = 45,
    // RESERVED_46 = 46,
    // RESERVED_47 = 47,
    // RESERVED_48 = 48,
    // RESERVED_49 = 49,
    // RESERVED_50 = 50
}

export const hasCapability = (
    capabilities: Capability[],
    capabilityToCheck: Capability): boolean => {
    return capabilities.includes(capabilityToCheck);
};

/**
 * 
 * @param capabilities Tüm kullanıcının sahip olduğu yetenekler
 * @param query Array içinde array şeklinde yetenek sorgusu. Örneğin: [[Capability.OWNER], [Capability.VIEW, Capability.EDIT]] şeklinde bir sorgu, kullanıcının ya OWNER yeteneğine sahip olmasını ya da hem VIEW hem de EDIT yeteneklerine sahip olmasını gerektirir.
 * @returns eğer kullanıcı, sorguda belirtilen yeteneklerden herhangi birine sahipse true döner, aksi takdirde false döner.
 */
export const hasCapabilityFromInnerArray = (capabilities: number[], query?: number[][]): boolean => {
    if (!query || query.length === 0) {
        return true; // If no specific capabilities are requested, consider it as having the capability.
    }
    for (const innerArray of query) {
        let hasAll = true;
        for (const capability of innerArray) {
            if (!capabilities.includes(capability)) {
                hasAll = false;
                break;
            }
        }
        if (hasAll) {
            return true;
        }
    }
    return false;
};

export const migrateFromStringToCapability = (capability: string): number[] => {
    switch (capability) {
        case "OWNER":
            return [Capability.OWNER];
        case "EDITOR":
            return [Capability.EDIT, Capability.ADD, Capability.DELETE, Capability.VIEW];
        case "EOG_ADJUST_MEMBERS":
            return [Capability.EOG_ADJUST_MEMBERS];
        case "EOG_ADJUST_CAPABILITIES":
            return [Capability.EOG_ADJUST_CAPABILITIES];
        case "EOG_EDIT_METADATA":
            return [Capability.EOG_EDIT_METADATA];
        case "LIBRARY":
            return [101]; // Lotus özel durum.
        case "TENANT":
            return [102]; // Lotus özel durum.
        default:
            return [Capability.VIEW]; // Default to VIEW if the capability string is unrecognized
    }
}

export const requestedCapabilitiesToString = (requestedCapabilities?: number[][]): string => {
    if (!requestedCapabilities) {
        return "<no requested capabilities>";
    }
    return "<requested caps." + requestedCapabilities.map(a => "(" + a.join(' and ') + ")").join(' or ') + ">";
}
// export type Capability = "OWNER" | "VIEW" | "ADD" | "EDIT" | "DELETE" | string;
// Bitmasking ileride benim başıma bela olacak o yüzden commentte dursun

// /**
//  * This enum defines the capabilities that a user can have in the system. Each capability is represented as a bit flag, allowing for efficient storage and checking of multiple capabilities using bitwise operations.
//  *
//  * The capabilities are defined as follows:
//  * - NONE: No capabilities (0)
//  * - OWNER: The user is the owner of the entity (1 << 0)
//  * - VIEW: The user can view the entity (1 << 1)
//  * - ADD: The user can add new entities (1 << 2)
//  * - EDIT: The user can edit existing entities (1 << 3)
//  * - DELETE: The user can delete entities (1 << 4)
//  *
//  * The enum values are powers of two, allowing for combinations of capabilities to be represented as a single number. For example, a user with both VIEW and EDIT capabilities would have a value of 6 (VIEW | EDIT).
//  *
//  * Utility functions are provided to check if a user has specific capabilities by performing bitwise AND operations.
//  */
// export enum OrbitalUserCapability {
//     NONE = 0,
//     OWNER = 1 << 0,
//     VIEW = 1 << 1,
//     ADD = 1 << 2,
//     EDIT = 1 << 3,
//     DELETE = 1 << 4,
// }

// export const isOwner = (capabilities: OrbitalUserCapability) => {
//     return (capabilities & OrbitalUserCapability.OWNER) === OrbitalUserCapability.OWNER;
// };

// export const canView = (capabilities: OrbitalUserCapability) => {
//     return (capabilities & OrbitalUserCapability.VIEW) === OrbitalUserCapability.VIEW;
// };

// export const canEditExist = (capabilities: OrbitalUserCapability) => {
//     return (capabilities & OrbitalUserCapability.EDIT) === OrbitalUserCapability.EDIT;
// };

// export const canAdd = (capabilities: OrbitalUserCapability) => {
//     return (capabilities & OrbitalUserCapability.ADD) === OrbitalUserCapability.ADD;
// };

// export const canDelete = (capabilities: OrbitalUserCapability) => {
//     return (capabilities & OrbitalUserCapability.DELETE) === OrbitalUserCapability.DELETE;
// };