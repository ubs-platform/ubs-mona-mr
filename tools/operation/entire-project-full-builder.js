"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibBuilder = void 0;
const package_build_1 = require("../data/package-build");
class LibBuilder {
    xrRootPackage;
    constructor(xrRootPackage) {
        this.xrRootPackage = xrRootPackage;
        if (xrRootPackage.projectMode == 'LIBRARY') {
            throw 'Library Iksir package is not supported';
        }
    }
    async initiateBuild() {
        // PREBUILD
        const packageBuilders = [];
        //  = this.xrRootPackage.children.map(
        //     (a) => new PackageBuilder(a),
        // );
        const chldrn = this.xrRootPackage.children;
        for (let index = 0; index < chldrn.length; index++) {
            const xrPackage = this.xrRootPackage.children[index];
            const builder = new package_build_1.PackageBuilder(xrPackage);
            await builder.prebuild();
            packageBuilders.push(builder);
        }
        // const packageBuildersArranged = packageBuilders.sort(
        //     (a, b) => a.imports.length - b.imports.length,
        // );
        // for (let index = 0; index < packages.length; index++) {
        //     const pkg = packages[index];
        //     await pkg.beginPrebuild();
        //     const imports = await pkg.collectImports();
        // }
    }
}
exports.LibBuilder = LibBuilder;
