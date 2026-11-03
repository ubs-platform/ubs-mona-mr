import { IksirPackage } from '../data/iksir-package';
export interface EntireBuildOptions {
    publishNpm?: boolean;
    directPublish?: boolean;
    patchAnotherDirectory?: boolean;
    patchTarget?: string;
}
export declare class AllLibrariesBuilder {
    private xrRootPackage;
    constructor(xrRootPackage: IksirPackage);
    initiateBuildPublish(props: EntireBuildOptions): Promise<void>;
    private publishOnNpm;
}
