import * as FileSystem from 'fs/promises';
import path from 'path';
import cJSON, { CommentObject } from 'comment-json';
import type { PackageJson } from 'types-package-json';
import {
    IIksirPackageConfig,
    IksirLibraryMode,
    IksirProjectType,
    NpmPackageWithIksir,
} from './iksir-library-config';
import { JsonUtil } from '../util/json-util';
import { TypescriptConfiguration } from '../util/typescript-util';
import { DirectoryUtil } from '../util/directory-util';
import { ExecUtil } from '../util/exec-util';
import { TextUtil } from '../util/text-util';

export class IksirPackage {
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
    children: IksirPackage[] = [];
    childrenVersionTag: string;
    version: string;
    childrenAccess: string;

    public async beginPrebuild() {
        if (this.projectMode == 'LIBRARY') {
            await FileSystem.rm(this.rawBuildDirectory, {
                recursive: true,
                force: true,
            });
            await ExecUtil.exec(`tsc -p ${this.tsBuildConfigFile}`);
        } else {
            throw 'instance-is-not-library';
        }
    }

    get packageName() {
        return this.packageObject.name;
    }

    static async loadPackage(
        projectDirectory: string,
        parent?: IksirPackage,
    ): Promise<IksirPackage | null> {
        console.info('Package is loading', projectDirectory);
        const projectPackageJson = await JsonUtil.readJson<NpmPackageWithIksir>(
            projectDirectory,
            'package.json',
        );

        const iksirPaket = new IksirPackage();
        iksirPaket.directory = projectDirectory;
        iksirPaket.packageObject = projectPackageJson;
        iksirPaket.projectMode = projectPackageJson.iksir?.type || 'ROOT';
        iksirPaket.libraryMode =
            projectPackageJson.iksir?.libraryMode || 'PEER';
        if (iksirPaket.projectMode == 'ROOT') {
            if (!parent) {
                iksirPaket.tsConfigFile = path.join(
                    projectDirectory,
                    projectPackageJson.iksir?.tsConfigFile || 'tsconfig.json',
                );
                iksirPaket.childrenVersionTag =
                    iksirPaket.packageObject.iksir.childrenVersionTag ||
                    'stable';
                iksirPaket.childrenAccess =
                    iksirPaket.packageObject.iksir.childrenAccess || 'public';
                iksirPaket.version = iksirPaket.packageObject.version;
                iksirPaket.tsConfig =
                    await JsonUtil.readJson<TypescriptConfiguration>(
                        iksirPaket.tsConfigFile,
                    );
            } else {
                return null;
            }
        } else if (parent) {
            iksirPaket.tsBuildConfigFile = path.join(
                projectDirectory,
                projectPackageJson.iksir?.tsBuildConfigFile ||
                    'tsconfig.lib-publish.json',
            );

            iksirPaket.tsBuildConfig =
                await JsonUtil.readJson<TypescriptConfiguration>(
                    iksirPaket.tsBuildConfigFile,
                );

            iksirPaket.rawBuildDirectory = path.join(
                projectDirectory,
                iksirPaket.tsBuildConfig!.compilerOptions.outDir,
            );
            iksirPaket.buildDirectory = path.join(
                iksirPaket.rawBuildDirectory,
                projectPackageJson.iksir?.buildSubFolder || '',
            );
            iksirPaket.parent = parent;
            parent.children.push(iksirPaket);
        }
        return iksirPaket;
    }

    static async scanRoot(parentProjectDirectory: string) {
        const packageList: IksirPackage[] = [];
        let parent: IksirPackage;
        await DirectoryUtil.circulateFilesRecursive(
            parentProjectDirectory,
            async (a) => {
                if (
                    a.endsWith('package.json') &&
                    !a.includes('node_modules') &&
                    !a.includes('dist')
                ) {
                    const directory = path.dirname(a);
                    const pkg = await this.loadPackage(directory, parent);
                    if (pkg) {
                        if (pkg.projectMode == 'ROOT' && !parent) {
                            parent = pkg;
                        }
                    }
                }
            },
        );
        return parent;
    }
}
