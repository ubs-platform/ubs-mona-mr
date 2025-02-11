import path from 'path';
import { TextUtil } from '../util/text-util';
import { NpmPackageWithIksir } from './iksir-library-config';
import { IksirPackage } from './iksir-package';
import * as FileSystem from 'fs/promises';

export interface ImportedPackage {
    scope: 'PROJECT' | 'PARENT_PACKAGE_JSON' | 'UNKNOWN';
    packageName: string;
    parentNpmVersion?: string;
    iksirPackage?: IksirPackage;
    digested?: boolean;
}

export class PackageBuilder {
    /**
     *
     */
    imports: ImportedPackage[] = [];
    // projectImports: ImportedPackage[] = [];
    // parentPackageImports: ImportedPackage[] = [];
    parent: IksirPackage;
    packageForFullCompilation: NpmPackageWithIksir;
    private _isPrebuilt = false;
    buildPath: string;

    constructor(public iksirPackage: IksirPackage) {
        this.reset(iksirPackage);
    }

    get projectImports() {
        return this.imports.filter((a) => a.scope == 'PROJECT');
    }

    get parentPackageImports() {
        return this.imports.filter((a) => a.scope == 'PARENT_PACKAGE_JSON');
    }

    private reset(iksirPackage: IksirPackage) {
        this.parent = iksirPackage.parent;
        this.packageForFullCompilation = { ...iksirPackage.packageObject };
        this._isPrebuilt = false;
        this.imports = [];
        this.buildPath = iksirPackage.buildDirectory;
    }

    async writePackage() {
        // todo: package jsonu kaydet
    }

    async digest(importedLibraryBuild: PackageBuilder, version: string) {
        const xrPak = importedLibraryBuild.iksirPackage;
        const localImport = this.projectImports.find(
            (a) => a.packageName == xrPak.packageObject.name,
        );
        if (xrPak.libraryMode == 'PEER') {
            localImport.parentNpmVersion = version;
            this.applyToPackageJsonBuild(localImport);
            // const import =
        } else if (xrPak.libraryMode == 'EMBEDDED') {
            const theirBuildPath = importedLibraryBuild.buildPath;
            const ourBuildPath = this.buildPath;
            const ourEmbedPath = path.join(ourBuildPath, '_iksir-embed');
            await FileSystem.mkdir(ourEmbedPath, { recursive: true });
            await FileSystem.copyFile(theirBuildPath, ourEmbedPath);
        }
    }

    get isPrebuilt() {
        return this._isPrebuilt;
    }

    public async prebuild() {
        await this.iksirPackage.beginPrebuild();
        this.imports = await this.collectImports();
        for (let index = 0; index < this.imports.length; index++) {
            const libImport = this.imports[index];
            if (libImport.scope == 'PARENT_PACKAGE_JSON') {
                this.applyToPackageJsonBuild(libImport);
            }
        }

        this._isPrebuilt = true;
    }

    private applyToPackageJsonBuild(libImport: ImportedPackage) {
        this.packageForFullCompilation.peerDependencies[libImport.packageName] =
            libImport.parentNpmVersion;
        libImport.digested = true;
    }

    public async collectImports() {
        const regex = /require\(\"(.*)\"\)/g;
        const imports = await TextUtil.findByRegex(
            this.iksirPackage.buildDirectory,
            [regex],
        );

        const usedPackages: ImportedPackage[] = [];
        const founds = imports.get(regex);
        for (let index = 0; index < founds.length; index++) {
            const found = founds[index];
            let packageName = found.found[1];
            if (
                !packageName.startsWith('./') &&
                !packageName.startsWith('../') &&
                !packageName.startsWith('/')
            ) {
                const deps = this.parent.packageObject.dependencies;
                let packageNameTwoSegment = packageName
                        .split('/')
                        .slice(0, 2)
                        .join('/'),
                    packageNameOneSegment = packageName.split('/')[0];

                let projectLibrary = this.parent.children.find(
                    (a) =>
                        a.projectMode == 'LIBRARY' &&
                        a.packageObject.name == packageNameTwoSegment,
                );

                if (
                    projectLibrary &&
                    !usedPackages.find(
                        (a) =>
                            a.packageName == projectLibrary.packageObject.name,
                    )
                ) {
                    usedPackages.push({
                        packageName: packageNameTwoSegment,
                        iksirPackage: projectLibrary,
                        scope: 'PROJECT',
                    });
                } else if (
                    deps[packageNameTwoSegment] &&
                    !usedPackages.find(
                        (a) => a.packageName == packageNameTwoSegment,
                    )
                ) {
                    usedPackages.push({
                        packageName: packageNameTwoSegment,
                        parentNpmVersion: deps[packageNameTwoSegment],
                        scope: 'PARENT_PACKAGE_JSON',
                    });
                } else if (
                    deps[packageNameOneSegment] &&
                    !usedPackages.find(
                        (a) => a.packageName == packageNameOneSegment,
                    )
                ) {
                    usedPackages.push({
                        packageName: packageNameOneSegment,
                        parentNpmVersion: deps[packageNameOneSegment],
                        scope: 'PARENT_PACKAGE_JSON',
                    });
                }
            }
        }
        return usedPackages;
        // .forEach((a) => console.info());
    }
}
IksirPackage.scanPackages('/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr')
    .then(async (a) => {
        for (let index = 0; index < a.length; index++) {
            if (a[index].projectMode == 'ROOT') continue;

            const packageBuild = new PackageBuilder(a[index]);
            console.info(a[index].packageObject.name);
            await packageBuild.prebuild();
            console.info('_-----_');
            packageBuild.projectImports.forEach((a) =>
                console.info(a.packageName),
            );
            console.info('-_____-');
            // console.info({
            //     İsim: b.packageObject.name,
            //     'Ham Derleme Klasörü': b.rawBuildDirectory,
            //     'Derleme Klasörü': b.buildDirectory,
            //     Klasör: b.directory,
            //     'Proje Modu': b.projectMode,
            //     'Kütüphane Modu': b.libraryMode,
            //     'Çocuk sayısı': b.children.length,
            //     Evebeyn: b.parent?.packageObject.name,
            // });
            // if (b.projectMode == 'LIBRARY') {
            // }
        }
    })
    .catch(console.error);
