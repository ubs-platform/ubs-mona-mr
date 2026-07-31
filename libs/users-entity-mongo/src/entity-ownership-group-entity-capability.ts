import { Capability } from "@ubs-platform/users-common";

export class EntityOwnershipGroupEntityCapability {
    entityGroup!: string;
    entityName!: string;
    capabilities: Capability[] = [];

    /**
     * @deprecated string tabanlı capability alanı yerine capabilities alanı kullanılacak.
     *
     */
    capability!: string;
}