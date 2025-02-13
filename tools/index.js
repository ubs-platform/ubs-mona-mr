"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const colors_1 = require("./util/colors");
const all_libraries_builder_1 = require("./operation/all-libraries-builder");
const iksir_package_1 = require("./data/iksir-package");
console.info(`
██╗   ██╗██████╗ ███████╗    ███╗   ███╗ ██████╗ ███╗   ██╗ █████╗     ███████╗
██║   ██║██╔══██╗██╔════╝    ████╗ ████║██╔═══██╗████╗  ██║██╔══██╗    ██╔════╝
██║   ██║██████╔╝███████╗    ██╔████╔██║██║   ██║██╔██╗ ██║███████║    ███████╗
██║   ██║██╔══██╗╚════██║    ██║╚██╔╝██║██║   ██║██║╚██╗██║██╔══██║    ╚════██║
╚██████╔╝██████╔╝███████║    ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║██║  ██║    ███████║
 ╚═════╝ ╚═════╝ ╚══════╝    ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝    ╚══════╝
UBS MonaXr Tools                        UNLIMITED BUNDLE SYSTEMS         H.C.G`);
const actionList = {
    'publish-lib': {
        info: 'Builds libraries and pushes into NPM Registry',
        action: async (workDir, params) => {
            const p = await iksir_package_1.IksirPackage.scanPackages(workDir);
            const paket = p.find((a) => a.projectMode == 'ROOT');
            const paketBuilder = new all_libraries_builder_1.AllLibrariesBuilder(paket);
            await paketBuilder.initiateBuildPublish({ publishNpm: true });
        },
    },
    publish: {
        info: 'Builds App and Libraries and pushes into related positions',
        action: async (workDir, params) => { },
    },
    patch: {
        info: 'Builds libraries and patches into another library (such as node_modules)',
        action: async (workDir, params) => {
            const p = await iksir_package_1.IksirPackage.scanPackages(workDir);
            const paket = p.find((a) => a.projectMode == 'ROOT');
            const paketBuilder = new all_libraries_builder_1.AllLibrariesBuilder(paket);
            await paketBuilder.initiateBuildPublish({
                publishNpm: false,
                patchToProject: true,
            });
        },
    },
    help: {
        info: 'Prints actions and parameters that can be used for monaxr command',
        action: async (params) => {
            console.info('Usage: node ./index.js [COMMAND] [Extra Parameters]');
            console.info('Available Commands:\n', Object.entries(actionList)
                .map(([key, val]) => `${key} => ${val.info}`)
                .join('\n'));
        },
    },
};
const [node, file, action, ...parameters] = process.argv;
const workingDirectory = process.cwd();
console.info('Working directory is ' + workingDirectory);
let actionObj = actionList[action];
if (actionObj == null) {
    console.warn((0, colors_1.strColor)(colors_1.ANSI.FgYellow, `${action} action is not found. You can review the available commands`));
    actionObj = actionList['help'];
}
actionObj
    .action(workingDirectory, parameters)
    .then(() => {
    console.info((0, colors_1.strColor)(colors_1.ANSI.FgGreen, 'It seems there is no problem'));
})
    .catch((error) => {
    console.info((0, colors_1.strColor)(colors_1.ANSI.FgRed, 'Task has been failed. You can review error via following output'));
    console.error(error);
});
