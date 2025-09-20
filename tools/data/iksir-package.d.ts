import { IksirLibraryMode, IksirProjectType, NpmPackageWithIksir } from './iksir-library-config';
import { TypescriptConfiguration } from '../util/typescript-util';
export declare class IksirPackage {
    directory: string;
    rawBuildDirectory: string;
    buildDirectory: string;
    projectMode: IksirProjectType;
    libraryMode: IksirLibraryMode;
    packageObject: NpmPackageWithIksir;
    tsConfigFile?: string;
    tsConfig?: TypescriptConfiguration;
    tsBuildConfig?: TypescriptConfiguration;
    tsBuildConfigFile?: string;
    parent?: IksirPackage;
    children: IksirPackage[];
    childrenVersionTag: string;
    version: string;
    childrenAccess: string;
    beginPrebuild(): Promise<void>;
    get packageName(): string;
    static loadPackage(projectDirectory: string, parent?: IksirPackage): Promise<IksirPackage | null>;
    static scanRoot(parentProjectDirectory: string): Promise<IksirPackage>;
}
