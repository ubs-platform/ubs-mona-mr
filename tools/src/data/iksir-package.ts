import * as FileSystem from 'fs/promises';
import path from 'path';
import cJSON, { CommentObject } from 'comment-json';
import type { PackageJson } from 'types-package-json';
import {
    IIksirLibraryConfig,
    IksirLibraryMode,
    IksirProjectType,
    NpmPackageWithIksir,
} from './iksir-library-config';
import { JsonUtil } from '../util/json-util';
import { TypescriptConfiguration } from '../util/typescript-util';
import { DirectoryUtil } from '../util/directory-util';
import { ExecUtil } from '../util/exec-util';

export class IksirPackage {
    directory: string;
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

    public async libraryPrebuild() {
        if (this.projectMode == 'LIBRARY') {
            await FileSystem.rm(this.buildDirectory, {
                recursive: true,
                force: true,
            });
            await ExecUtil.exec(`tsc -p ${this.tsBuildConfigFile}`);
        } else {
            throw 'instance-is-not-library';
        }
    }

    static async loadPackage(projectDirectory: string, parent?: IksirPackage) {
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
            iksirPaket.tsConfigFile = path.join(
                projectDirectory,
                projectPackageJson.iksir?.tsConfigFile || 'tsconfig.json',
            );

            iksirPaket.tsConfig =
                await JsonUtil.readJson<TypescriptConfiguration>(
                    iksirPaket.tsConfigFile,
                );
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

            iksirPaket.buildDirectory = path.join(
                projectDirectory,
                iksirPaket.tsBuildConfig!.compilerOptions.outDir,
            );
            iksirPaket.parent = parent;
            parent.children.push(iksirPaket);
        }
        return iksirPaket;
    }

    static async scanPackages(parentProjectDirectory: string) {
        const packageList: IksirPackage[] = [];
        let parent: IksirPackage;
        await DirectoryUtil.circulateFilesRecursive(
            parentProjectDirectory,
            async (a) => {
                if (a.endsWith('package.json') && !a.includes('node_modules')) {
                    const directory = path.dirname(a);
                    const pkg = await this.loadPackage(directory, parent);
                    if (pkg.projectMode == 'ROOT') {
                        parent = pkg;
                    }
                    packageList.push(pkg);
                }
            },
        );

        return packageList;
    }
}

IksirPackage.scanPackages(
    '/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr',
).then(async (a) => {
    for (let index = 0; index < a.length; index++) {
        const b = a[index];
        console.info({
            İsim: b.packageObject.name,
            'Derleme Klasörü': b.buildDirectory,
            Klasör: b.directory,
            'Proje Modu': b.projectMode,
            'Kütüphane Modu': b.libraryMode,
            'Çocuk sayısı': b.children.length,
            Evebeyn: b.parent?.packageObject.name,
        });
        if (b.projectMode == 'LIBRARY') {
            console.info('Build ediliyor');
            await b.libraryPrebuild();
            console.info('Build edildi');
        }
    }
});
