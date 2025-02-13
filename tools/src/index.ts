import path from 'path';
import { ANSI, strColor } from './util/colors';
import { AllLibrariesBuilder } from './operation/all-libraries-builder';
import { IksirPackage } from './data/iksir-package';

console.info(
    `
██╗   ██╗██████╗ ███████╗    ███╗   ███╗ ██████╗ ███╗   ██╗ █████╗     ███████╗
██║   ██║██╔══██╗██╔════╝    ████╗ ████║██╔═══██╗████╗  ██║██╔══██╗    ██╔════╝
██║   ██║██████╔╝███████╗    ██╔████╔██║██║   ██║██╔██╗ ██║███████║    ███████╗
██║   ██║██╔══██╗╚════██║    ██║╚██╔╝██║██║   ██║██║╚██╗██║██╔══██║    ╚════██║
╚██████╔╝██████╔╝███████║    ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║██║  ██║    ███████║
 ╚═════╝ ╚═════╝ ╚══════╝    ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝    ╚══════╝
UBS MonaXr Tools                        UNLIMITED BUNDLE SYSTEMS         H.C.G`,
);

export interface IAction {
    info: string;
    action: (workingDirectory: string, parameters: string[]) => Promise<void>;
}

const actionList: { [key: string]: IAction } = {
    'publish-lib': {
        info: 'Builds libraries and pushes into NPM Registry',
        action: async (workDir, params) => {
            const p = await IksirPackage.scanPackages(workDir);
            const paket = p.find((a) => a.projectMode == 'ROOT');
            const paketBuilder = new AllLibrariesBuilder(paket);
            await paketBuilder.initiateBuildPublish({ publishNpm: true });
        },
    },
    publish: {
        info: 'Builds App and Libraries and pushes into related positions',
        action: async (workDir, params) => {},
    },
    patch: {
        info: 'Builds libraries and patches into another library (such as node_modules)',
        action: async (workDir, params) => {
            const p = await IksirPackage.scanPackages(workDir);
            const paket = p.find((a) => a.projectMode == 'ROOT');
            const paketBuilder = new AllLibrariesBuilder(paket);
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
            ANSI.FgYellow,
            `${action} action is not found. You can review the available commands`,
        ),
    );
    actionObj = actionList['help'];
}

actionObj
    .action(workingDirectory, parameters)
    .then(() => {
        console.info(strColor(ANSI.FgGreen, 'It seems there is no problem'));
    })
    .catch((error) => {
        console.info(
            strColor(
                ANSI.FgRed,
                'Task has been failed. You can review error via following output',
            ),
        );
        console.error(error);
    });
