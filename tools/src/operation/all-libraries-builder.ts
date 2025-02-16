import { exec } from 'child_process';
import { IksirPackage } from '../data/iksir-package';
import { PackageBuilder } from '../data/package-build';
import { ExecUtil } from '../util/exec-util';
import * as FileSystem from 'fs/promises';
import path from 'path';
import { strColor, COLORS } from '../util/colors';
export interface EntireBuildOptions {
    publishNpm?: boolean;
    patchAnotherDirectory?: boolean;
    patchTarget?: string;
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
        if (props.publishNpm || props.patchAnotherDirectory) {
            for (
                let index = 0;
                index < packageBuildersArranged.length;
                index++
            ) {
                const currentBuild = packageBuildersArranged[index];
                if (currentBuild.iksirPackage.libraryMode == 'PEER') {
                    if (props.publishNpm) {
                        await this.publishOnNpm(
                            currentBuild,
                            versionTag,
                            versionVisibility,
                        );
                    } else {
                        const patchDirectory = path.join(
                            this.xrRootPackage.directory,
                            props.patchTarget,
                            currentBuild.packageName,
                        );
                        console.info(
                            strColor(
                                COLORS.FgBlue,
                                `Patching ${currentBuild.packageName} into ${patchDirectory}`,
                            ),
                        );
                        FileSystem.cp(currentBuild.buildPath, patchDirectory, {
                            recursive: true,
                        });
                        console.info(
                            strColor(
                                COLORS.FgGreen,
                                `Patched ${currentBuild.packageName} into ${patchDirectory}`,
                            ),
                        );
                    }
                }
            }
        } else {
            console.info(
                'These packages will not published or another project will not be patched',
            );
        }
    }

    private async publishOnNpm(
        currentBuild: PackageBuilder,
        versionTag: string,
        versionVisibility: string,
    ) {
        console.info(
            `${currentBuild.packageName} is about to be published on NPM Registry`,
        );

        await ExecUtil.exec(
            `cd "${currentBuild.buildPath}" && npm publish --tag ${versionTag} --access ${versionVisibility}`,
        );
    }
}
