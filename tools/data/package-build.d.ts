import { NpmPackageWithIksir } from './iksir-library-config';
import { IksirPackage } from './iksir-package';
export interface ImportedPackage {
    scope: 'PROJECT' | 'PARENT_PACKAGE_JSON' | 'UNKNOWN';
    packageName: string;
    parentNpmVersion?: string;
    iksirPackage?: IksirPackage;
    digested?: boolean;
}
export declare class PackageBuilder {
    iksirPackage: IksirPackage;
    imports: ImportedPackage[];
    parent: IksirPackage;
    packageForFullCompilation: NpmPackageWithIksir;
    private _isPrebuilt;
    readonly EMBED_DIRECTORY_NAME: string;
    constructor(iksirPackage: IksirPackage);
    get packageName(): string;
    get projectImports(): ImportedPackage[];
    get parentPackageImports(): ImportedPackage[];
    private reset;
    writePackage(version: string): Promise<void>;
    digest(importedLibraryBuild: PackageBuilder): Promise<void>;
    get isPrebuilt(): boolean;
    prebuild(): Promise<void>;
    private applyToPackageJsonBuild;
    collectImports(): Promise<ImportedPackage[]>;
}
