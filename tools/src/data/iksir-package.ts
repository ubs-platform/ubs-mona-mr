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

export class IksirPackage {
    directory: string;
    buildDirectory: string;
    projectMode: IksirProjectType;
    libraryMode: IksirLibraryMode;
    packageObject: NpmPackageWithIksir;
    typescriptConfiguration: TypescriptConfiguration;
    parent?: IksirPackage;
    children: IksirPackage[] = [];

    static async loadPackage(projectDirectory: string, parent?: IksirPackage) {
        const projectPackageJson = await JsonUtil.readJson<NpmPackageWithIksir>(
            projectDirectory,
            'package.json',
        );

        const iksirPaket = new IksirPackage();
        iksirPaket.directory = projectDirectory;
        iksirPaket.packageObject = projectPackageJson;
        iksirPaket.projectMode = projectPackageJson.iksir?.type || 'ROOT';
        projectPackageJson.iksir?.libraryMode || 'PEER';
        if (iksirPaket.projectMode == 'ROOT') {
            iksirPaket.typescriptConfiguration =
                await JsonUtil.readJson<TypescriptConfiguration>(
                    projectDirectory,
                    'tsconfig.json',
                );
        } else if (parent) {
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

// IksirPackage.scanPackages(
//     '/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr',
// ).then((a) =>
//     a.forEach((b) =>
//         console.info({
//             İsim: b.packageObject.name,
//             'Derleme Klasörü': b.buildDirectory,
//             Klasör: b.directory,
//             'Proje Modu': b.projectMode,
//             'Kütüphane Modu': b.libraryMode,
//             'Çocuk sayısı': b.children.length,
//             Evebeyn: b.parent?.packageObject.name,
//         }),
//     ),
// );
