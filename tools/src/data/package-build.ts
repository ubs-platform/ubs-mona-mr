import path from 'path';
import { TextUtil } from '../util/text-util';
import { NpmPackageWithIksir } from './iksir-library-config';
import { IksirPackage } from './iksir-package';
import * as FileSystem from 'fs/promises';
import * as cJSON from 'comment-json';
import { JsonUtil } from '../util/json-util';
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
    readonly EMBED_DIRECTORY_NAME: string = '_monaembed';

    constructor(public iksirPackage: IksirPackage) {
        this.reset(iksirPackage);
    }

    get packageName() {
        return this.iksirPackage.packageName;
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

    async writePackage(version: string) {
        console.info('Package.json is writing');
        this.packageForFullCompilation.version = version;
        await JsonUtil.writeJson(
            this.packageForFullCompilation,
            this.buildPath,
            'package.json',
        );
        // await FileSystem.writeFile(
        //     path.join(this.buildPath, 'package.json'),
        //     JSON.stringify(this.packageForFullCompilation),
        //     'utf-8',
        // );
        // todo: package jsonu kaydet
    }

    async digest(importedLibraryBuild: PackageBuilder) {
        console.info(
            importedLibraryBuild.packageName +
                ' is digesting into ' +
                this.packageName,
        );

        const version = this.iksirPackage.parent.packageObject.version;

        const xrPak = importedLibraryBuild.iksirPackage;
        const localImport = this.projectImports.find(
            (a) => a.packageName == xrPak.packageObject.name,
        );
        if (xrPak.libraryMode == 'PEER') {
            console.info(
                importedLibraryBuild.packageName +
                    "'s library mode is PEER, that is mean you need to publish to registry",
            );
            localImport.parentNpmVersion = version;
            this.applyToPackageJsonBuild(localImport);
            // const import =
        } else if (xrPak.libraryMode == 'EMBEDDED') {
            console.info(
                importedLibraryBuild.packageName + 'is being embedded',
            );
            const theirBuildPath = importedLibraryBuild.buildPath;
            const ourBuildPath = this.buildPath;
            const ourEmbedPath = path.join(
                ourBuildPath,
                this.EMBED_DIRECTORY_NAME,
                importedLibraryBuild.packageName,
            );
            console.info(importedLibraryBuild.packageName + 'is copying');
            await FileSystem.mkdir(ourEmbedPath, { recursive: true });
            await FileSystem.cp(theirBuildPath, ourEmbedPath, {
                recursive: true,
            });

            await TextUtil.replaceText(ourBuildPath, [
                {
                    finding: `"${xrPak.packageName}"`,
                    replaceWith: (filePath: string) => {
                        if (filePath.includes(this.EMBED_DIRECTORY_NAME)) {
                            console.info(
                                'Embed directory is about to be ignored',
                            );
                            return;
                        }
                        const directory = path.join(filePath, '..');
                        let relativeOfEmbed = path.relative(
                            directory,
                            path.join(ourEmbedPath),
                        );

                        if (
                            !relativeOfEmbed.startsWith('.') &&
                            !relativeOfEmbed.startsWith('/')
                        ) {
                            relativeOfEmbed = './' + relativeOfEmbed;
                        }

                        console.info(
                            xrPak.packageName +
                                ' import is being replaced with ' +
                                relativeOfEmbed +
                                ' for ' +
                                filePath,
                        );

                        return `"${relativeOfEmbed}"`;
                    },
                },
            ]);
            localImport.digested = true;
        } else {
            console.warn(
                importedLibraryBuild.packageName +
                    "'s library mode is not defined or configured wrongly. To fix this, please set 'iksir.libraryMode' as EMBEDDED or PEER",
            );
        }
    }

    get isPrebuilt() {
        return this._isPrebuilt;
    }

    public async prebuild() {
        console.info(this.packageName + ' is pre-building via tsc');
        await this.iksirPackage.beginPrebuild();
        console.info('Collecting imports for' + this.packageName);
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
        if (this.packageForFullCompilation.peerDependencies == null) {
            this.packageForFullCompilation.peerDependencies = {};
        }
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
