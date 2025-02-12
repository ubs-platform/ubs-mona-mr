'use strict';
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              var desc = Object.getOwnPropertyDescriptor(m, k);
              if (
                  !desc ||
                  ('get' in desc
                      ? !m.__esModule
                      : desc.writable || desc.configurable)
              ) {
                  desc = {
                      enumerable: true,
                      get: function () {
                          return m[k];
                      },
                  };
              }
              Object.defineProperty(o, k2, desc);
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, 'default', {
                  enumerable: true,
                  value: v,
              });
          }
        : function (o, v) {
              o['default'] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (
                    k !== 'default' &&
                    Object.prototype.hasOwnProperty.call(mod, k)
                )
                    __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
exports.PackageBuilder = void 0;
const path_1 = __importDefault(require('path'));
const text_util_1 = require('../util/text-util');
const FileSystem = __importStar(require('fs/promises'));
class PackageBuilder {
    iksirPackage;
    /**
     *
     */
    imports = [];
    // projectImports: ImportedPackage[] = [];
    // parentPackageImports: ImportedPackage[] = [];
    parent;
    packageForFullCompilation;
    _isPrebuilt = false;
    buildPath;
    EMBED_DIRECTORY_NAME = '_monaembed';
    constructor(iksirPackage) {
        this.iksirPackage = iksirPackage;
        this.reset(iksirPackage);
    }
    get packageName() {
        return this.iksirPackage.packageName;
    }
    get projectImports() {
        return this.imports.filter((a) => a.scope == 'PROJECT');
    }
    get parentPackageImports() {
        return this.imports.filter((a) => a.scope == 'PARENT_PACKAGE_JSON');
    }
    reset(iksirPackage) {
        this.parent = iksirPackage.parent;
        this.packageForFullCompilation = { ...iksirPackage.packageObject };
        this._isPrebuilt = false;
        this.imports = [];
        this.buildPath = iksirPackage.buildDirectory;
    }
    async writePackage(version) {
        console.info('Package.json is writing');
        this.packageForFullCompilation.version = version;
        await FileSystem.writeFile(
            path_1.default.join(this.buildPath, 'package.json'),
            JSON.stringify(this.packageForFullCompilation),
            'utf-8',
        );
        // todo: package jsonu kaydet
    }
    async digest(importedLibraryBuild, version) {
        console.info(
            importedLibraryBuild.packageName +
                ' is digesting into ' +
                this.packageName,
        );
        const xrPak = importedLibraryBuild.iksirPackage;
        const localImport = this.projectImports.find(
            (a) => a.packageName == xrPak.packageObject.name,
        );
        if (xrPak.libraryMode == 'PEER') {
            console.info(
                importedLibraryBuild.packageName +
                    "'s library mode is PEER, that is mean you need to publish to registry",
            );
            localImport.parentNpmVersion = version;
            this.applyToPackageJsonBuild(localImport);
            // const import =
        } else if (xrPak.libraryMode == 'EMBEDDED') {
            console.info(
                importedLibraryBuild.packageName + 'is being embedded',
            );
            const theirBuildPath = importedLibraryBuild.buildPath;
            const ourBuildPath = this.buildPath;
            const ourEmbedPath = path_1.default.join(
                ourBuildPath,
                this.EMBED_DIRECTORY_NAME,
                importedLibraryBuild.packageName,
            );
            console.info(importedLibraryBuild.packageName + 'is copying');
            await FileSystem.mkdir(ourEmbedPath, { recursive: true });
            await FileSystem.cp(theirBuildPath, ourEmbedPath, {
                recursive: true,
            });
            await text_util_1.TextUtil.replaceText(ourBuildPath, [
                {
                    finding: `"${xrPak.packageName}"`,
                    replaceWith: (filePath) => {
                        if (filePath.includes(this.EMBED_DIRECTORY_NAME)) {
                            console.info(
                                'Embed directory is about to be ignored',
                            );
                            return;
                        }
                        const directory = path_1.default.join(filePath, '..');
                        let relativeOfEmbed = path_1.default.relative(
                            directory,
                            path_1.default.join(ourEmbedPath),
                        );
                        if (
                            !relativeOfEmbed.startsWith('.') &&
                            !relativeOfEmbed.startsWith('/')
                        ) {
                            relativeOfEmbed = './' + relativeOfEmbed;
                        }
                        console.info(
                            xrPak.packageName +
                                ' import is being replaced with ' +
                                relativeOfEmbed +
                                ' for ' +
                                filePath,
                        );
                        return `"${relativeOfEmbed}"`;
                    },
                },
            ]);
            localImport.digested = true;
        } else {
            console.warn(
                importedLibraryBuild.packageName +
                    "'s library mode is not defined or configured wrongly. To fix this, please set 'iksir.libraryMode' as EMBEDDED or PEER",
            );
        }
    }
    get isPrebuilt() {
        return this._isPrebuilt;
    }
    async prebuild() {
        console.info(this.packageName + ' is pre-building via tsc');
        await this.iksirPackage.beginPrebuild();
        console.info('Collecting imports for' + this.packageName);
        this.imports = await this.collectImports();
        for (let index = 0; index < this.imports.length; index++) {
            const libImport = this.imports[index];
            if (libImport.scope == 'PARENT_PACKAGE_JSON') {
                this.applyToPackageJsonBuild(libImport);
            }
        }
        this._isPrebuilt = true;
    }
    applyToPackageJsonBuild(libImport) {
        if (this.packageForFullCompilation.peerDependencies == null) {
            this.packageForFullCompilation.peerDependencies = {};
        }
        this.packageForFullCompilation.peerDependencies[libImport.packageName] =
            libImport.parentNpmVersion;
        libImport.digested = true;
    }
    async collectImports() {
        const regex = /require\(\"(.*)\"\)/g;
        const imports = await text_util_1.TextUtil.findByRegex(
            this.iksirPackage.buildDirectory,
            [regex],
        );
        const usedPackages = [];
        const founds = imports.get(regex);
        for (let index = 0; index < founds.length; index++) {
            const found = founds[index];
            let packageName = found.found[1];
            if (
                !packageName.startsWith('./') &&
                !packageName.startsWith('../') &&
                !packageName.startsWith('/')
            ) {
                const deps = this.parent.packageObject.dependencies;
                let packageNameTwoSegment = packageName
                        .split('/')
                        .slice(0, 2)
                        .join('/'),
                    packageNameOneSegment = packageName.split('/')[0];
                let projectLibrary = this.parent.children.find(
                    (a) =>
                        a.projectMode == 'LIBRARY' &&
                        a.packageObject.name == packageNameTwoSegment,
                );
                if (
                    projectLibrary &&
                    !usedPackages.find(
                        (a) =>
                            a.packageName == projectLibrary.packageObject.name,
                    )
                ) {
                    usedPackages.push({
                        packageName: packageNameTwoSegment,
                        iksirPackage: projectLibrary,
                        scope: 'PROJECT',
                    });
                } else if (
                    deps[packageNameTwoSegment] &&
                    !usedPackages.find(
                        (a) => a.packageName == packageNameTwoSegment,
                    )
                ) {
                    usedPackages.push({
                        packageName: packageNameTwoSegment,
                        parentNpmVersion: deps[packageNameTwoSegment],
                        scope: 'PARENT_PACKAGE_JSON',
                    });
                } else if (
                    deps[packageNameOneSegment] &&
                    !usedPackages.find(
                        (a) => a.packageName == packageNameOneSegment,
                    )
                ) {
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
