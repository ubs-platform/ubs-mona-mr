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
