import { Capability } from "@ubs-platform/users-common";

export class UserCapability {
    userId?: string;

    capabilities: Capability[] = [];

    /**
 * @deprecated
 */
    capability?: string;
}
