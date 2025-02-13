"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllLibrariesBuilder = void 0;
const package_build_1 = require("../data/package-build");
const exec_util_1 = require("../util/exec-util");
class AllLibrariesBuilder {
    xrRootPackage;
    constructor(xrRootPackage) {
        this.xrRootPackage = xrRootPackage;
        if (xrRootPackage.projectMode == 'LIBRARY') {
            throw 'Library Iksir package is not supported';
        }
    }
    async initiateBuildPublish(props) {
        // PREBUILD
        const packageBuilders = [];
        const version = this.xrRootPackage.version;
        const versionTag = this.xrRootPackage.childrenVersionTag;
        const versionVisibility = this.xrRootPackage.childrenAccess;
        //  = this.xrRootPackage.children.map(
        //     (a) => new PackageBuilder(a),
        // );
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
        if (props.publishNpm || props.patchToProject) {
            for (let index = 0; index < packageBuildersArranged.length; index++) {
                const currentBuild = packageBuildersArranged[index];
                if (currentBuild.iksirPackage.libraryMode == 'PEER') {
                    if (props.publishNpm) {
                        console.info(`${currentBuild.packageName} is about to be published on NPM Registry`);
                        await exec_util_1.ExecUtil.exec(`cd "${currentBuild.buildPath}" && npm publish --tag ${versionTag} --access ${versionVisibility}`);
                    }
                    else {
                    }
                }
            }
        }
        else {
            console.info('These packages will not published or another project will not be patched');
        }
        // for (let index = 0; index < packages.length; index++) {
        //     const pkg = packages[index];
        //     await pkg.beginPrebuild();
        //     const imports = await pkg.collectImports();
        // }
    }
}
exports.AllLibrariesBuilder = AllLibrariesBuilder;
// IksirPackage.scanPackages('/home/huseyin/dev/tk-ubs/users-mona-mr')
//     .then(async (a) => {
//         for (let index = 0; index < a.length; index++) {
//             if (a[index].projectMode == 'ROOT') {
//                 const builder = new AllLibrariesBuilder(a[index]);
//                 await builder.initiateBuildPublish({ publishNpm: false });
//                 break;
//             } else {
//             }
//             // const packageBuild = new PackageBuilder(a[index]);
//             // console.info(a[index].packageObject.name);
//             // await packageBuild.prebuild();
//             // console.info('_-----_');
//             // packageBuild.projectImports.forEach((a) =>
//             //     console.info(a.packageName),
//             // );
//             // console.info('-_____-');
//         }
//     })
//     .catch(console.error);
