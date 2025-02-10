"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IksirPackage = void 0;
const path_1 = __importDefault(require("path"));
const json_util_1 = require("../util/json-util");
const directory_util_1 = require("../util/directory-util");
class IksirPackage {
    directory;
    buildDirectory;
    projectMode;
    libraryMode;
    packageObject;
    typescriptConfiguration;
    parent;
    children = [];
    static async loadPackage(projectDirectory, parent) {
        const projectPackageJson = await json_util_1.JsonUtil.readJson(projectDirectory, 'package.json');
        const iksirPaket = new IksirPackage();
        iksirPaket.directory = projectDirectory;
        iksirPaket.packageObject = projectPackageJson;
        iksirPaket.projectMode = projectPackageJson.iksir?.type || 'ROOT';
        projectPackageJson.iksir?.libraryMode || 'PEER';
        if (iksirPaket.projectMode == 'ROOT') {
            iksirPaket.typescriptConfiguration =
                await json_util_1.JsonUtil.readJson(projectDirectory, 'tsconfig.json');
        }
        else if (parent) {
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
IksirPackage.scanPackages('/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr').then((a) => a.forEach((b) => console.info({
    İsim: b.packageObject.name,
    'Derleme Klasörü': b.buildDirectory,
    Klasör: b.directory,
    'Proje Modu': b.projectMode,
    'Kütüphane Modu': b.libraryMode,
    'Çocuk sayısı': b.children.length,
    Evebeyn: b.parent?.packageObject.name,
})));
