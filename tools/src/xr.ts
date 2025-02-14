import path from 'path';
import { TEXTCOLORS, strColor } from './util/colors';
import { AllLibrariesBuilder } from './operation/all-libraries-builder';
import { IksirPackage } from './data/iksir-package';
import { NestJsCliWrap } from './operation/nest-cli-wrap';

console.info(
    `
▗▖  ▗▖ ▗▄▖ ▗▖  ▗▖ ▗▄▖ ▗▖  ▗▖▗▄▄▖ 
▐▛▚▞▜▌▐▌ ▐▌▐▛▚▖▐▌▐▌ ▐▌ ▝▚▞▘ ▐▌ ▐▌
▐▌  ▐▌▐▌ ▐▌▐▌ ▝▜▌▐▛▀▜▌  ▐▌  ▐▛▀▚▖
▐▌  ▐▌▝▚▄▞▘▐▌  ▐▌▐▌ ▐▌▗▞▘▝▚▖▐▌ ▐▌
MonaXr for Mona5            H.C.G`,
);

export interface IAction {
    info: string;
    action: (...workingDirectoryAndParameters: string[]) => Promise<void>;
}

const actionList: { [key: string]: IAction } = {
    'publish-libs': {
        info: 'Builds libraries and pushes into NPM Registry',
        action: async (workDir) => {
            const paket = await IksirPackage.scanRoot(workDir);
            const paketBuilder = new AllLibrariesBuilder(paket);
            await paketBuilder.initiateBuildPublish({ publishNpm: true });
        },
    },
    'patch-libs': {
        info: "Builds libraries and patches them into another directory (like your project's node_modules directory)",
        action: async (workDir, targetDirectory) => {
            if (targetDirectory) {
                const paket = await IksirPackage.scanRoot(workDir);
                const paketBuilder = new AllLibrariesBuilder(paket);
                await paketBuilder.initiateBuildPublish({
                    patchAnotherDirectory: true,
                    patchTarget: targetDirectory,
                });
            } else {
                throw 'Target directory is needed. If you want to patch your another project that uses Mona, that directory should end with node_modules. More details, use "npm run xr:help"';
            }
        },
    },

    'extend-lib': {
        info: 'Makes a nestjs library compitable for xr',
        action: async (workDir, targetDirectory) => {
            if (targetDirectory) {
                const a = await new NestJsCliWrap(workDir);
                a.extendLib(targetDirectory);
            } else {
                throw "Target directory is needed. Usually it is 'libs/library-name'";
            }
        },
    },

    help: {
        info: 'Prints actions and parameters that can be used for monaxr command',
        action: async (params) => {
            console.info(
                'MonaXr  is a tool that helps compile and publish their auxiliary libraries safely and quickly. This is not a replacement for "Nestjs CLI". It just helps with more orderly development in the Mona repository',
            );

            console.info('Usage: npm run xr [COMMAND] [Extra Parameters]');
            console.info(
                'Available Commands:\n',
                Object.entries(actionList)
                    .map(([key, val]) => `${key} => ${val.info}`)
                    .join('\n'),
            );
        },
    },
};
const [node, file, action, ...parameters] = process.argv;
const workingDirectory = process.cwd();
console.info('Working directory is ' + workingDirectory);
let actionObj = actionList[action];
if (actionObj == null) {
    console.warn(
        strColor(
            TEXTCOLORS.FgYellow,
            `${action} action is not found. You can review the available commands`,
        ),
    );
    actionObj = actionList['help'];
}

actionObj
    .action(workingDirectory, ...parameters)
    .then(() => {
        console.info(
            strColor(TEXTCOLORS.FgGreen, 'It seems there is no problem'),
        );
    })
    .catch((error) => {
        console.info(
            strColor(
                TEXTCOLORS.FgRed,
                'Task has been failed. You can review error via following output',
            ),
        );
        console.error(error);
    });
