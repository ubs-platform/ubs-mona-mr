import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { detect } from 'detect-port';
import * as Http from 'http';
import * as HttpProxy from 'http-proxy';
import * as Os from 'os';

export class LoadbalancedProxy {
    static isProxyProcess() {
        const [node, file, ...parameters] = process.argv;
        return (
            process.env.UBS_MAIN_PROCESS == 'true' &&
            !parameters.includes('--worker')
        );
    }

    static async beginParentStage() {
        let processGear = 0;
        const port = parseInt(process.env.PORT!) || 3000;
        const [node, file, ...parameters] = process.argv;

        const childProcesses: {
            port: string;
            process: ChildProcessWithoutNullStreams;
        }[] = [];
        let processCount =
            parseInt(process.env.UBS_MAIN_PROCESS_COUNT!) ||
            Os.cpus().length / 2;
        process.on('SIGINT', function () {
            console.log('Caught interrupt signal');
            childProcesses.forEach((a) => {
                console.info(a.process.pid, 'is about to be shut down');
                console.info(a.process.kill('SIGINT'));
            });
            process.exit();
        });

        for (let index = 0; index < processCount; index++) {
            let slavePort = (await detect(port + index + 1)).toString();
            const processx = spawn(node, [file, '--worker', ...parameters], {
                env: { ...process.env, PORT: slavePort },
            });
            const pid = processx.pid;
            processx.stdout.on('data', function (data) {
                console.info(`Process#${pid}: ${data}`);
            });

            processx.stderr.on('data', function (data) {
                console.error(`Process#${pid}: ${data}`);
            });

            processx.on('close', function (code) {
                console.info(`Process#${pid} is about to be shut down`);
            });

            childProcesses.push({
                port: slavePort,
                process: processx,
            });
        }

        const proxyServer = HttpProxy.createProxyServer();

        Http.createServer((req, res) => {
            // Add any needed fields to
            proxyServer.web(req, res, {
                target: 'http://0.0.0.0:' + childProcesses[processGear].port,
                /**Math.floor(Math.random() * processCount) */
            });
            processGear = (processGear + 1) % processCount;
        }).listen(port, () => {
            console.log('Proxy server is running in port 3000');
        });
    }
}
