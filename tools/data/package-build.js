"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageBuilder = void 0;
const text_util_1 = require("../util/text-util");
const iksir_package_1 = require("./iksir-package");
class PackageBuilder {
    iksirPackage;
    /**
     *
     */
    imports = [];
    projectImports = [];
    parentPackageImports = [];
    parent;
    _isPrebuilt = false;
    constructor(iksirPackage) {
        this.iksirPackage = iksirPackage;
        this.parent = iksirPackage.parent;
    }
    get isPrebuilt() {
        return this._isPrebuilt;
    }
    async prebuild() {
        await this.iksirPackage.beginPrebuild();
        this.imports = await this.collectImports();
        this.imports.forEach((a) => (a.scope == 'PROJECT'
            ? this.projectImports
            : this.parentPackageImports).push(a));
        this._isPrebuilt = true;
    }
    async collectImports() {
        const regex = /require\(\"(.*)\"\)/g;
        const imports = await text_util_1.TextUtil.findByRegex(this.iksirPackage.buildDirectory, [regex]);
        const usedPackages = [];
        const founds = imports.get(regex);
        for (let index = 0; index < founds.length; index++) {
            const found = founds[index];
            let packageName = found.found[1];
            if (!packageName.startsWith('./') &&
                !packageName.startsWith('../') &&
                !packageName.startsWith('/')) {
                const deps = this.parent.packageObject.dependencies;
                let packageNameTwoSegment = packageName
                    .split('/')
                    .slice(0, 2)
                    .join('/'), packageNameOneSegment = packageName.split('/')[0];
                let projectLibrary = this.parent.children.find((a) => a.projectMode == 'LIBRARY' &&
                    a.packageObject.name == packageNameTwoSegment);
                if (projectLibrary &&
                    !usedPackages.find((a) => a.packageName == projectLibrary.packageObject.name)) {
                    usedPackages.push({
                        packageName: packageNameTwoSegment,
                        iksirPackage: projectLibrary,
                        scope: 'PROJECT',
                    });
                }
                else if (deps[packageNameTwoSegment] &&
                    !usedPackages.find((a) => a.packageName == packageNameTwoSegment)) {
                    usedPackages.push({
                        packageName: packageNameTwoSegment,
                        parentNpmVersion: deps[packageNameTwoSegment],
                        scope: 'PARENT_PACKAGE_JSON',
                    });
                }
                else if (deps[packageNameOneSegment] &&
                    !usedPackages.find((a) => a.packageName == packageNameOneSegment)) {
                    usedPackages.push({
                        packageName: packageNameOneSegment,
                        parentNpmVersion: deps[packageNameOneSegment],
                        scope: 'PARENT_PACKAGE_JSON',
                    });
                }
            }
        }
        return usedPackages;
        // .forEach((a) => console.info());
    }
}
exports.PackageBuilder = PackageBuilder;
iksir_package_1.IksirPackage.scanPackages('/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr')
    .then(async (a) => {
    for (let index = 0; index < a.length; index++) {
        if (a[index].projectMode == 'ROOT')
            continue;
        const packageBuild = new PackageBuilder(a[index]);
        console.info(a[index].packageObject.name);
        await packageBuild.prebuild();
        console.info('_-----_');
        packageBuild.projectImports.forEach((a) => console.info(a.packageName));
        console.info('-_____-');
        // console.info({
        //     İsim: b.packageObject.name,
        //     'Ham Derleme Klasörü': b.rawBuildDirectory,
        //     'Derleme Klasörü': b.buildDirectory,
        //     Klasör: b.directory,
        //     'Proje Modu': b.projectMode,
        //     'Kütüphane Modu': b.libraryMode,
        //     'Çocuk sayısı': b.children.length,
        //     Evebeyn: b.parent?.packageObject.name,
        // });
        // if (b.projectMode == 'LIBRARY') {
        // }
    }
})
    .catch(console.error);
