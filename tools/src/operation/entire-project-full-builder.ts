import { exec } from 'child_process';
import { IksirPackage } from '../data/iksir-package';
import { PackageBuilder } from '../data/package-build';
import { ExecUtil } from '../util/exec-util';

export class LibBuilder {
    constructor(private xrRootPackage: IksirPackage) {
        if (xrRootPackage.projectMode == 'LIBRARY') {
            throw 'Library Iksir package is not supported';
        }
    }

    async initiateBuildPublish(publishNpm: boolean) {
        // PREBUILD
        const packageBuilders: PackageBuilder[] = [];

        const version = this.xrRootPackage.version;
        const versionTag = this.xrRootPackage.childrenVersionTag;
        const versionVisibility = this.xrRootPackage.childrenAccess;

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
            (a, b) => a.projectImports.length - b.projectImports.length,
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
                await currentBuild.digest(importedLibraryBuild);
            }
            await currentBuild.writePackage(version);
        }
        if (publishNpm) {
            for (
                let index = 0;
                index < packageBuildersArranged.length;
                index++
            ) {
                const currentBuild = packageBuildersArranged[index];
                console.info(
                    `${currentBuild.packageName} is about to be published on NPM Registry`,
                );

                await ExecUtil.exec(
                    `cd "${currentBuild.buildPath}" && npm publish --tag ${versionTag} --access ${versionVisibility}`,
                );
            }
        } else {
            console.info('These packages will not published');
        }

        // for (let index = 0; index < packages.length; index++) {
        //     const pkg = packages[index];
        //     await pkg.beginPrebuild();
        //     const imports = await pkg.collectImports();
        // }
    }
}

IksirPackage.scanPackages('/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr')
    .then(async (a) => {
        for (let index = 0; index < a.length; index++) {
            if (a[index].projectMode == 'ROOT') {
                const builder = new LibBuilder(a[index]);
                await builder.initiateBuildPublish(true);
            } else {
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
