import { exec } from 'child_process';
import { IksirPackage } from '../data/iksir-package';
import { PackageBuilder } from '../data/package-build';
import { ExecUtil } from '../util/exec-util';
export interface EntireBuildOptions {
    publishNpm?: boolean;
    patchToProject?: boolean;
}
export class AllLibrariesBuilder {
    constructor(private xrRootPackage: IksirPackage) {
        if (xrRootPackage.projectMode == 'LIBRARY') {
            throw 'Library Iksir package is not supported';
        }
    }

    async initiateBuildPublish(props: EntireBuildOptions) {
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
        if (props.publishNpm || props.patchToProject) {
            for (
                let index = 0;
                index < packageBuildersArranged.length;
                index++
            ) {
                const currentBuild = packageBuildersArranged[index];
                if (currentBuild.iksirPackage.libraryMode == 'PEER') {
                    if (props.publishNpm) {
                        console.info(
                            `${currentBuild.packageName} is about to be published on NPM Registry`,
                        );

                        await ExecUtil.exec(
                            `cd "${currentBuild.buildPath}" && npm publish --tag ${versionTag} --access ${versionVisibility}`,
                        );
                    } else {
                    }
                }
            }
        } else {
            console.info(
                'These packages will not published or another project will not be patched',
            );
        }
    }
}
