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
    (function () {
        var ownKeys = function (o) {
            ownKeys =
                Object.getOwnPropertyNames ||
                function (o) {
                    var ar = [];
                    for (var k in o)
                        if (Object.prototype.hasOwnProperty.call(o, k))
                            ar[ar.length] = k;
                    return ar;
                };
            return ownKeys(o);
        };
        return function (mod) {
            if (mod && mod.__esModule) return mod;
            var result = {};
            if (mod != null)
                for (var k = ownKeys(mod), i = 0; i < k.length; i++)
                    if (k[i] !== 'default') __createBinding(result, mod, k[i]);
            __setModuleDefault(result, mod);
            return result;
        };
    })();
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
exports.NestJsCliWrap = void 0;
const json_util_1 = require('../util/json-util');
const colors_1 = require('../util/colors');
const FileSystem = __importStar(require('fs/promises'));
const path_1 = __importDefault(require('path'));
class NestJsCliWrap {
    workingDirectory;
    constructor(workingDirectory) {
        this.workingDirectory = workingDirectory;
    }
    async checkPrefixIsSame() {
        const { pak, nestCliJson } = await this.readConfig();
        const ourPrefix = pak.iksir.childrenPrefix,
            nestPrefix = nestCliJson['defaultLibraryPrefix'] || '@app';
        if (ourPrefix != nestPrefix) {
            console.warn(
                (0, colors_1.strColor)(
                    colors_1.TEXTCOLORS.FgYellow,
                    '<nest-cli.json>defaultLibraryPrefix is not same with <package.json>iksir.childrenPrefix.\n' +
                        'Therefore, to avoid any errors, make sure that these values\n' +
                        'are the same in these two files and that the library paths start with this value.',
                ),
            );
        }
    }
    async readConfig() {
        const nestCliJson =
                await json_util_1.JsonUtil.readJson('nest-cli.json'),
            pak = await json_util_1.JsonUtil.readJson('package.json');
        return { pak, nestCliJson };
    }
    async extendLib(libPath) {
        const configs = await this.readConfig();
        const libraryFullPath = path_1.default.join(
            this.workingDirectory,
            libPath,
        );
        const libName = path_1.default.basename(libraryFullPath);
        const fullLibName = path_1.default.join(
            configs.nestCliJson['defaultLibraryPrefix'],
            libName,
        );
        const tsPublishJsonPath = path_1.default.join(
            libraryFullPath,
            'tsconfig.lib-publish.json',
        );
        const libPackageJsonPath = path_1.default.join(
            libraryFullPath,
            'package.json',
        );
        await FileSystem.copyFile(
            path_1.default.join(libraryFullPath, 'tsconfig.lib.json'),
            tsPublishJsonPath,
        );
        const tsPublishObj =
            await json_util_1.JsonUtil.readJson(tsPublishJsonPath);
        if (tsPublishObj['exclude'] == null) {
            tsPublishObj['exclude'] = [];
        }
        tsPublishObj['exclude'].push(
            path_1.default.join(
                configs.nestCliJson['defaultLibraryPrefix'],
                '**',
            ),
        );
        await json_util_1.JsonUtil.writeJson(tsPublishObj, tsPublishJsonPath);
        const libNodePackage = {
            name: fullLibName,
            version: '1.0.0',
            iksir: {
                type: 'LIBRARY',
                libraryMode: 'PEER',
                buildSubFolder: '',
            },
        };
        console.info(
            (0, colors_1.strColor)(
                colors_1.TEXTCOLORS.BgYellow,
                "If you don't want to push to NPM Registry, set iksir.libraryMode to 'EMBEDDED' in package.json",
            ),
        );
        console.info(
            (0, colors_1.strColor)(
                colors_1.TEXTCOLORS.BgYellow,
                `And if another libraries is being imported, tsc will compile with others. So you should set iksir.buildSubFolder to '${libName}/src'`,
            ),
        );
        await json_util_1.JsonUtil.writeJson(
            libNodePackage,
            libPackageJsonPath,
        );
        // await ExecUtil.exec(
        //     `node node_modules/@nestjs/schematics/dist/index.js --name=${name} --source-root="${this.workingDirectory}" --no-dry-run --no-skip-import --language="ts" --spec --no-flat --spec-file-suffix="spec"`,
        // );
    }
}
exports.NestJsCliWrap = NestJsCliWrap;
// const wrp = new NestJsCliWrap(
//     '/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr',
// );
// wrp.checkPrefixIsSame().then(async (a) => {
//     await wrp.extendLib('libs/extend-lib-test');
// });
