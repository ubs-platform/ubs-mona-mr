"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const colors_1 = require("./util/colors");
const all_libraries_builder_1 = require("./operation/all-libraries-builder");
const iksir_package_1 = require("./data/iksir-package");
console.info(`
▗▖  ▗▖ ▗▄▖ ▗▖  ▗▖ ▗▄▖ ▗▖  ▗▖▗▄▄▖ 
▐▛▚▞▜▌▐▌ ▐▌▐▛▚▖▐▌▐▌ ▐▌ ▝▚▞▘ ▐▌ ▐▌
▐▌  ▐▌▐▌ ▐▌▐▌ ▝▜▌▐▛▀▜▌  ▐▌  ▐▛▀▚▖
▐▌  ▐▌▝▚▄▞▘▐▌  ▐▌▐▌ ▐▌▗▞▘▝▚▖▐▌ ▐▌
MonaXr for Mona5            H.C.G`);
const actionList = {
    'publish-libs': {
        info: 'Builds libraries and pushes into NPM Registry',
        action: async (workDir) => {
            const paket = await iksir_package_1.IksirPackage.scanRoot(workDir);
            const paketBuilder = new all_libraries_builder_1.AllLibrariesBuilder(paket);
            await paketBuilder.initiateBuildPublish({ publishNpm: true });
        },
    },
    'patch-libs': {
        info: "Builds libraries and patches them into another directory (like your project's node_modules directory)",
        action: async (workDir, targetDirectory) => {
            if (targetDirectory) {
                const paket = await iksir_package_1.IksirPackage.scanRoot(workDir);
                const paketBuilder = new all_libraries_builder_1.AllLibrariesBuilder(paket);
                await paketBuilder.initiateBuildPublish({
                    patchAnotherDirectory: true,
                    patchTarget: targetDirectory,
                });
            }
            else {
                throw 'Target directory is needed. If you want to patch your another project that uses Mona, that directory should end with node_modules. More details, use "npm run xr:help"';
            }
        },
    },
    'publish-app': {
        info: 'Builds App and pushes into related positions',
        action: async (workDir, params) => { },
    },
    'ready-lib': {
        info: 'Prepares a library for buildable for xr (Ex: ready-lib ./libs/<library-name>)',
        action: async (workDir, params) => { },
    },
    help: {
        info: 'Prints actions and parameters that can be used for monaxr command',
        action: async (params) => {
            console.info('MonaXr (iksir) is a tool that helps compile and ship microservice applications and publish their auxiliary libraries safely and quickly. This is not a replacement for "Nestjs CLI". It just helps with more orderly development in the Mona repository');
            console.info('Usage: npm run xr [COMMAND] [Extra Parameters]');
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
    console.warn((0, colors_1.strColor)(colors_1.TEXTCOLORS.FgYellow, `${action} action is not found. You can review the available commands`));
    actionObj = actionList['help'];
}
actionObj
    .action(workingDirectory, ...parameters)
    .then(() => {
    console.info((0, colors_1.strColor)(colors_1.TEXTCOLORS.FgGreen, 'It seems there is no problem'));
})
    .catch((error) => {
    console.info((0, colors_1.strColor)(colors_1.TEXTCOLORS.FgRed, 'Task has been failed. You can review error via following output'));
    console.error(error);
});
