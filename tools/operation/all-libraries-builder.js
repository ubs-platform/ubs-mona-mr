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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllLibrariesBuilder = void 0;
const package_build_1 = require("../data/package-build");
const exec_util_1 = require("../util/exec-util");
const FileSystem = __importStar(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const colors_1 = require("../util/colors");
class AllLibrariesBuilder {
    constructor(xrRootPackage) {
        this.xrRootPackage = xrRootPackage;
        if (xrRootPackage.projectMode == 'LIBRARY') {
            throw 'Library Iksir package is not supported';
        }
    }
    async initiateBuildPublish(props) {
        const packageBuilders = [];
        const version = this.xrRootPackage.version;
        const versionTag = this.xrRootPackage.childrenVersionTag;
        const versionVisibility = this.xrRootPackage.childrenAccess;
        const chldrn = this.xrRootPackage.children;
        const builderMap = new Map();
        for (let index = 0; index < chldrn.length; index++) {
            const xrPackage = this.xrRootPackage.children[index];
            const builder = new package_build_1.PackageBuilder(xrPackage);
            await builder.prebuild();
            packageBuilders.push(builder);
            builderMap.set(builder.iksirPackage.packageObject.name, builder);
        }
        const packageBuildersArranged = packageBuilders.sort((a, b) => a.projectImports.length - b.projectImports.length);
        for (let index = 0; index < packageBuildersArranged.length; index++) {
            const currentBuild = packageBuildersArranged[index];
            for (let index = 0; index < currentBuild.projectImports.length; index++) {
                const projectImprt = currentBuild.projectImports[index];
                const importedLibraryBuild = builderMap.get(projectImprt.packageName);
                await currentBuild.digest(importedLibraryBuild);
            }
            await currentBuild.writePackage(version);
        }
        if (props.publishNpm || props.patchAnotherDirectory) {
            for (let index = 0; index < packageBuildersArranged.length; index++) {
                const currentBuild = packageBuildersArranged[index];
                if (currentBuild.iksirPackage.libraryMode == 'PEER') {
                    if (props.publishNpm) {
                        await this.publishOnNpm(currentBuild, versionTag, versionVisibility);
                    }
                    else {
                        const patchDirectory = props.patchTarget.startsWith('/')
                            ? path_1.default.join(this.xrRootPackage.directory, props.patchTarget, currentBuild.packageName)
                            : path_1.default.join(props.patchTarget, currentBuild.packageName);
                        console.info((0, colors_1.strColor)(colors_1.COLORS.FgBlue, `Patching ${currentBuild.packageName} into ${patchDirectory}`));
                        FileSystem.cp(currentBuild.iksirPackage.buildDirectory, patchDirectory, {
                            recursive: true,
                        });
                        console.info((0, colors_1.strColor)(colors_1.COLORS.FgGreen, `Patched ${currentBuild.packageName} into ${patchDirectory}`));
                    }
                }
            }
        }
        else {
            console.info('These packages will not published or another project will not be patched');
        }
    }
    async publishOnNpm(currentBuild, versionTag, versionVisibility) {
        console.info(`${currentBuild.packageName} is about to be published on NPM Registry`);
        await exec_util_1.ExecUtil.exec(`cd "${currentBuild.iksirPackage.buildDirectory}" && npm publish --tag ${versionTag} --access ${versionVisibility}`);
    }
}
exports.AllLibrariesBuilder = AllLibrariesBuilder;
//# sourceMappingURL=all-libraries-builder.js.map