import { IksirPackage } from '../data/iksir-package';
import { PackageBuilder } from '../data/package-build';

export class LibBuilder {
    constructor(private xrRootPackage: IksirPackage) {
        if (xrRootPackage.projectMode == 'LIBRARY') {
            throw 'Library Iksir package is not supported';
        }
    }

    async initiateBuildPublish(packageVersion: string, publishNpm: boolean) {
        // PREBUILD
        const packageBuilders: PackageBuilder[] = [];

        //  = this.xrRootPackage.children.map(
        //     (a) => new PackageBuilder(a),
        // );
        const chldrn = this.xrRootPackage.children;
        const builderMap: Map<String, PackageBuilder> = new Map();

        for (let index = 0; index < chldrn.length; index++) {
            const xrPackage = this.xrRootPackage.children[index];
            const builder = new PackageBuilder(xrPackage);
            await builder.prebuild();
            packageBuilders.push(builder);
            builderMap.set(builder.iksirPackage.packageObject.name, builder);
        }
        const packageBuildersArranged = packageBuilders.sort(
            (a, b) => a.projectImports.length - a.projectImports.length,
        );

        for (let index = 0; index < packageBuildersArranged.length; index++) {
            const currentBuild = packageBuildersArranged[index];
            for (
                let index = 0;
                index < currentBuild.projectImports.length;
                index++
            ) {
                const projectImprt = currentBuild.projectImports[index];
                const importedLibraryBuild = builderMap.get(
                    projectImprt.packageName,
                );
                await currentBuild.digest(importedLibraryBuild, packageVersion);
            }
            await currentBuild.writePackage();
        }

        // for (let index = 0; index < packages.length; index++) {
        //     const pkg = packages[index];
        //     await pkg.beginPrebuild();
        //     const imports = await pkg.collectImports();
        // }
    }
}
