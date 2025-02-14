import { PackageJson } from 'types-package-json';
import { JsonUtil } from '../util/json-util';
import {
    IIksirPackageConfig,
    NpmPackageWithIksir,
} from '../data/iksir-library-config';
import { strColor, TEXTCOLORS } from '../util/colors';
import { ExecUtil } from '../util/exec-util';

export class NestJsCliWrap {
    constructor(private workingDirectory: string) {}

    async checkPrefixIsSame() {
        const nestCliJson = await JsonUtil.readJson('nest-cli.json'),
            pak = await JsonUtil.readJson<NpmPackageWithIksir>('package.json');
        const ourPrefix = pak.iksir!.childrenPrefix,
            nestPrefix = nestCliJson['defaultLibraryPrefix'] || '@app';
        if (ourPrefix != nestPrefix) {
            throw strColor(
                TEXTCOLORS.FgYellow,
                '<nest-cli.json>defaultLibraryPrefix is not same with <package.json>iksir.childrenPrefix.\n' +
                    'Therefore, to avoid any errors, make sure that these values\n' +
                    'are the same in these two files and that the library paths start with this value.',
            );
        }
    }

    async generateLib(name: string) {
        await ExecUtil.exec(
            `node @nestjs/schematics:library --name=${name} --source-root="${this.workingDirectory}" --no-dry-run --no-skip-import --language="ts" --spec --no-flat --spec-file-suffix="spec"`,
        );
    }
}

const wrp = new NestJsCliWrap(
    '/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr',
);

wrp.checkPrefixIsSame().then((a) => {
    wrp.generateLib('users-testo');
});
