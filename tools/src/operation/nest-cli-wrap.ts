import { PackageJson } from 'types-package-json';
import { JsonUtil } from '../util/json-util';
import {
    IIksirPackageConfig,
    NpmPackageWithIksir,
} from '../data/iksir-library-config';
import { strColor, TEXTCOLORS } from '../util/colors';
import { ExecUtil } from '../util/exec-util';
import * as FileSystem from 'fs/promises';
import path from 'path';

export class NestJsCliWrap {
    constructor(private workingDirectory: string) {}

    async checkPrefixIsSame() {
        const { pak, nestCliJson } = await this.readConfig();
        const ourPrefix = pak.iksir!.childrenPrefix,
            nestPrefix = nestCliJson['defaultLibraryPrefix'] || '@app';
        if (ourPrefix != nestPrefix) {
            console.warn(
                strColor(
                    TEXTCOLORS.FgYellow,
                    '<nest-cli.json>defaultLibraryPrefix is not same with <package.json>iksir.childrenPrefix.\n' +
                        'Therefore, to avoid any errors, make sure that these values\n' +
                        'are the same in these two files and that the library paths start with this value.',
                ),
            );
        }
    }

    private async readConfig() {
        const nestCliJson = await JsonUtil.readJson('nest-cli.json'),
            pak = await JsonUtil.readJson<NpmPackageWithIksir>('package.json');
        return { pak, nestCliJson };
    }

    async extendLib(libPath: string) {
        const configs = await this.readConfig();
        const libraryFullPath = path.join(this.workingDirectory, libPath);
        const libName = path.basename(libraryFullPath);
        const fullLibName = path.join(
            configs.nestCliJson['defaultLibraryPrefix'],
            libName,
        );
        const tsPublishJsonPath = path.join(
            libraryFullPath,
            'tsconfig.lib-publish.json',
        );
        const libPackageJsonPath = path.join(libraryFullPath, 'package.json');
        await FileSystem.copyFile(
            path.join(libraryFullPath, 'tsconfig.lib.json'),
            tsPublishJsonPath,
        );
        const tsPublishObj = await JsonUtil.readJson(tsPublishJsonPath);
        if (tsPublishObj['excludes'] == null) {
            tsPublishObj['excludes'] = [];
        }
        tsPublishObj['excludes'].push(
            path.join(configs.nestCliJson['defaultLibraryPrefix'], '**'),
        );
        await JsonUtil.writeJson(tsPublishObj, tsPublishJsonPath);

        const libNodePackage: NpmPackageWithIksir = {
            name: fullLibName,
            version: '1.0.0',
            iksir: {
                type: 'LIBRARY',
                libraryMode: 'PEER',
                buildSubFolder: '',
            },
        };

        console.info(
            strColor(
                TEXTCOLORS.BgYellow,
                "If you don't want to push to NPM Registry, set iksir.libraryMode to 'EMBEDDED' in package.json",
            ),
        );

        console.info(
            strColor(
                TEXTCOLORS.BgYellow,
                `And if another libraries is being imported, tsc will compile with others. So you should set iksir.buildSubFolder to '${libName}/src'`,
            ),
        );

        await JsonUtil.writeJson(libNodePackage, libPackageJsonPath);

        // await ExecUtil.exec(
        //     `node node_modules/@nestjs/schematics/dist/index.js --name=${name} --source-root="${this.workingDirectory}" --no-dry-run --no-skip-import --language="ts" --spec --no-flat --spec-file-suffix="spec"`,
        // );
    }
}

// const wrp = new NestJsCliWrap(
//     '/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr',
// );

// wrp.checkPrefixIsSame().then(async (a) => {
//     await wrp.extendLib('libs/extend-lib-test');
// });
