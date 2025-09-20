import { PackageJson } from 'types-package-json';
export type IksirProjectType = 'ROOT' | 'LIBRARY';
export type IksirLibraryMode = 'EMBEDDED' | 'PEER';
export interface IIksirPackageConfig {
    type?: IksirProjectType;
    libraryMode?: IksirLibraryMode;
    tsConfigFile?: string;
    tsBuildConfigFile?: string;
    buildSubFolder?: string;
    childrenVersionTag?: string;
    childrenAccess?: string;
    childrenPrefix?: string;
}
export type NpmPackageWithIksir = PackageJson & {
    iksir?: IIksirPackageConfig;
};
