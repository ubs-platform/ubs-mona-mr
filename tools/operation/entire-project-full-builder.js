"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibBuilder = void 0;
const iksir_package_1 = require("../data/iksir-package");
const package_build_1 = require("../data/package-build");
class LibBuilder {
    xrRootPackage;
    constructor(xrRootPackage) {
        this.xrRootPackage = xrRootPackage;
        if (xrRootPackage.projectMode == 'LIBRARY') {
            throw 'Library Iksir package is not supported';
        }
    }
    async initiateBuildPublish(packageVersion, publishNpm) {
        // PREBUILD
        const packageBuilders = [];
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
                await currentBuild.digest(importedLibraryBuild, packageVersion);
            }
            await currentBuild.writePackage(packageVersion);
        }
        // for (let index = 0; index < packages.length; index++) {
        //     const pkg = packages[index];
        //     await pkg.beginPrebuild();
        //     const imports = await pkg.collectImports();
        // }
    }
}
exports.LibBuilder = LibBuilder;
iksir_package_1.IksirPackage.scanPackages('/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr')
    .then(async (a) => {
    for (let index = 0; index < a.length; index++) {
        if (a[index].projectMode == 'ROOT') {
            const builder = new LibBuilder(a[index]);
            await builder.initiateBuildPublish('31.69.77', false);
        }
        else {
        }
        // const packageBuild = new PackageBuilder(a[index]);
        // console.info(a[index].packageObject.name);
        // await packageBuild.prebuild();
        // console.info('_-----_');
        // packageBuild.projectImports.forEach((a) =>
        //     console.info(a.packageName),
        // );
        // console.info('-_____-');
    }
})
    .catch(console.error);
