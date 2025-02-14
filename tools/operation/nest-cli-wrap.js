"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestJsCliWrap = void 0;
const json_util_1 = require("../util/json-util");
const colors_1 = require("../util/colors");
const exec_util_1 = require("../util/exec-util");
class NestJsCliWrap {
    workingDirectory;
    constructor(workingDirectory) {
        this.workingDirectory = workingDirectory;
    }
    async checkPrefixIsSame() {
        const nestCliJson = await json_util_1.JsonUtil.readJson('nest-cli.json'), pak = await json_util_1.JsonUtil.readJson('package.json');
        const ourPrefix = pak.iksir.childrenPrefix, nestPrefix = nestCliJson['defaultLibraryPrefix'] || '@app';
        if (ourPrefix != nestPrefix) {
            throw (0, colors_1.strColor)(colors_1.TEXTCOLORS.FgYellow, '<nest-cli.json>defaultLibraryPrefix is not same with <package.json>iksir.childrenPrefix.\n' +
                'Therefore, to avoid any errors, make sure that these values\n' +
                'are the same in these two files and that the library paths start with this value.');
        }
    }
    async generateLib(name) {
        await exec_util_1.ExecUtil.exec(`nest generate lib ${name} --source-root="${this.workingDirectory}"`);
    }
}
exports.NestJsCliWrap = NestJsCliWrap;
const wrp = new NestJsCliWrap('/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr');
wrp.checkPrefixIsSame().then((a) => {
    wrp.generateLib('users-testo');
});
