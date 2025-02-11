"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IksirPackage = void 0;
const FileSystem = __importStar(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const json_util_1 = require("../util/json-util");
const directory_util_1 = require("../util/directory-util");
const exec_util_1 = require("../util/exec-util");
const text_util_1 = require("../util/text-util");
class IksirPackage {
    directory;
    rawBuildDirectory;
    buildDirectory;
    projectMode;
    libraryMode;
    packageObject;
    tsConfigFile;
    tsConfig;
    tsBuildConfig;
    tsBuildConfigFile;
    parent;
    children = [];
    async beginPrebuild() {
        if (this.projectMode == 'LIBRARY') {
            await FileSystem.rm(this.rawBuildDirectory, {
                recursive: true,
                force: true,
            });
            await exec_util_1.ExecUtil.exec(`tsc -p ${this.tsBuildConfigFile}`);
        }
        else {
            throw 'instance-is-not-library';
        }
    }
    async collectImports() {
        const regex = /require\(\"(.*)\"\)/g;
        const imports = await text_util_1.TextUtil.findByRegex(this.buildDirectory, [
            regex,
        ]);
        const usedPackages = [];
        const founds = imports.get(regex);
        for (let index = 0; index < founds.length; index++) {
            const found = founds[index];
            let packageName = found.found[1];
            if (!packageName.startsWith('./') &&
                !packageName.startsWith('../') &&
                !packageName.startsWith('/')) {
                const deps = this.parent.packageObject.dependencies;
                let packageNameTwoSegment = packageName
                    .split('/')
                    .slice(0, 2)
                    .join('/'), packageNameOneSegment = packageName.split('/')[0];
                let projectLibrary = this.parent.children.find((a) => a.projectMode == 'LIBRARY' &&
                    a.packageObject.name == packageNameTwoSegment);
                if (projectLibrary &&
                    !usedPackages.find((a) => a.packageName == projectLibrary.packageObject.name)) {
                    usedPackages.push({
                        packageName: packageNameTwoSegment,
                        iksirPackage: projectLibrary,
                        scope: 'PROJECT',
                    });
                }
                else if (deps[packageNameTwoSegment] &&
                    !usedPackages.find((a) => a.packageName == packageNameTwoSegment)) {
                    usedPackages.push({
                        packageName: packageNameTwoSegment,
                        parentNpmVersion: deps[packageNameTwoSegment],
                        scope: 'PARENT_PACKAGE_JSON',
                    });
                }
                else if (deps[packageNameOneSegment] &&
                    !usedPackages.find((a) => a.packageName == packageNameOneSegment)) {
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
    static async loadPackage(projectDirectory, parent) {
        const projectPackageJson = await json_util_1.JsonUtil.readJson(projectDirectory, 'package.json');
        const iksirPaket = new IksirPackage();
        iksirPaket.directory = projectDirectory;
        iksirPaket.packageObject = projectPackageJson;
        iksirPaket.projectMode = projectPackageJson.iksir?.type || 'ROOT';
        iksirPaket.libraryMode =
            projectPackageJson.iksir?.libraryMode || 'PEER';
        if (iksirPaket.projectMode == 'ROOT') {
            iksirPaket.tsConfigFile = path_1.default.join(projectDirectory, projectPackageJson.iksir?.tsConfigFile || 'tsconfig.json');
            iksirPaket.tsConfig =
                await json_util_1.JsonUtil.readJson(iksirPaket.tsConfigFile);
        }
        else if (parent) {
            iksirPaket.tsBuildConfigFile = path_1.default.join(projectDirectory, projectPackageJson.iksir?.tsBuildConfigFile ||
                'tsconfig.lib-publish.json');
            iksirPaket.tsBuildConfig =
                await json_util_1.JsonUtil.readJson(iksirPaket.tsBuildConfigFile);
            iksirPaket.rawBuildDirectory = path_1.default.join(projectDirectory, iksirPaket.tsBuildConfig.compilerOptions.outDir);
            iksirPaket.buildDirectory = path_1.default.join(iksirPaket.rawBuildDirectory, projectPackageJson.iksir?.buildSubFolder || '');
            iksirPaket.parent = parent;
            parent.children.push(iksirPaket);
        }
        return iksirPaket;
    }
    static async scanPackages(parentProjectDirectory) {
        const packageList = [];
        let parent;
        await directory_util_1.DirectoryUtil.circulateFilesRecursive(parentProjectDirectory, async (a) => {
            if (a.endsWith('package.json') && !a.includes('node_modules')) {
                const directory = path_1.default.dirname(a);
                const pkg = await this.loadPackage(directory, parent);
                if (pkg.projectMode == 'ROOT') {
                    parent = pkg;
                }
                packageList.push(pkg);
            }
        });
        return packageList;
    }
}
exports.IksirPackage = IksirPackage;
IksirPackage.scanPackages('/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr').then(async (a) => {
    for (let index = 0; index < a.length; index++) {
        const b = a[index];
        console.info({
            İsim: b.packageObject.name,
            'Ham Derleme Klasörü': b.rawBuildDirectory,
            'Derleme Klasörü': b.buildDirectory,
            Klasör: b.directory,
            'Proje Modu': b.projectMode,
            'Kütüphane Modu': b.libraryMode,
            'Çocuk sayısı': b.children.length,
            Evebeyn: b.parent?.packageObject.name,
        });
        if (b.projectMode == 'LIBRARY') {
            console.info('Build ediliyor');
            await b.beginPrebuild();
            console.info('Build edildi');
            const imports = await b.collectImports();
            imports.forEach((a) => console.info({ ...a, iksirPackage: undefined }));
        }
    }
});
