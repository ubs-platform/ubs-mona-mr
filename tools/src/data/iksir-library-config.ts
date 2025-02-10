import { PackageJson } from 'types-package-json';

export type IksirProjectType = 'ROOT' | 'LIBRARY';

export type IksirLibraryMode = 'EMBEDDED' | 'PEER';

export interface IIksirLibraryConfig {
    type?: IksirProjectType;
    libraryMode?: IksirLibraryMode;
    nameInProject?: string;
}

export type NpmPackageWithIksir = PackageJson & { iksir?: IIksirLibraryConfig };
