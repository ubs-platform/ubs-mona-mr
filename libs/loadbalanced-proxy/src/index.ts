import {
    ChildProcess,
    ChildProcessWithoutNullStreams,
    fork,
    spawn,
} from 'child_process';
import { error } from 'console';
import { detect } from 'detect-port';
import * as Http from 'http';
import * as HttpProxy from 'http-proxy';
import * as Os from 'os';

export class LoadbalancedProxy {
    childProcesses: {
        port: string;
        process: ChildProcess;
    }[] = [];
    closingStage = false;
    processGear = -1;
    proxyServerStatus: 'STOPPED' | 'STARTING' | 'STARTED' = 'STOPPED';
    server: Http.Server<
        typeof Http.IncomingMessage,
        typeof Http.ServerResponse
    >;
    port: number;

    static isProxyProcess() {
        const [node, file, ...parameters] = process.argv;
        return (
            process.env.UBS_MAIN_PROCESS == 'true' &&
            !parameters.includes('--worker')
        );
    }

    async beginParentStage() {
        this.port = parseInt(process.env.PORT!) || 3000;
        const [node, file, ...parameters] = process.argv;

        let processCount =
            parseInt(process.env.UBS_MAIN_PROCESS_COUNT!) ||
            Os.cpus().length / 2;

        process.on('beforeExit', () => {
            this.closingStage = true;
            console.log('Caught interrupt signal');
            this.childProcesses?.forEach((a) => {
                console.info(a.process.pid, 'is about to be shut down');
                a.process.kill();
            });
            process.exit();
        });

        for (let index = 0; index < processCount; index++) {
            let slavePort = (this.port + index + 1).toString();
            this.spawnProcess(node, file, parameters, slavePort);
        }
    }

    private startProxyServer() {
        if (this.proxyServerStatus == 'STOPPED') {
            const proxyServer = HttpProxy.createProxyServer();
            this.proxyServerStatus = 'STARTING';
            this.server = Http.createServer((req, res) => {
                this.processGear =
                    (this.processGear + 1) % this.childProcesses.length;
                // Add any needed fields to
                try {
                    proxyServer.web(req, res, {
                        target:
                            'http://127.0.0.1:' +
                            this.childProcesses[this.processGear].port,
                        /**Math.floor(Math.random() * processCount) */
                    });
                } catch (error) {
                    console.error(error);
                    this.stopProxyServer();
                }
            });
            this.server.listen(this.port, () => {
                console.log('Proxy server is running in port 3000');
                this.proxyServerStatus = 'STARTED';
            });
            this.server.addListener('error', (e) => {
                console.error(e);
                this.restartProxyServer();
            });
            this.server.addListener('close', (e) => {
                console.info(e);
                this.restartProxyServer();
            });
        }
    }

    private stopProxyServer() {
        if (this.proxyServerStatus != 'STOPPED') {
            this.server.close();
            this.proxyServerStatus = 'STOPPED';
        }
    }

    restartProxyServer() {
        this.stopProxyServer();
        if (!this.closingStage) {
            this.startProxyServer();
        }
    }

    private async spawnProcess(
        node: string,
        file: string,
        parameters: string[],
        workerPort: string,
    ) {
        workerPort = (await detect(workerPort)).toString();
        const processx = fork(file, ['--worker', ...parameters], {
            env: { ...process.env, PORT: workerPort },
        });
        const pid = processx.pid;
        processx.on('message', (a) => {
            if (a == 'app-ready') {
                this.startProxyServer();
            }
        });
        // processx.stdout.on('data', (data) => {
        //     console.info(`Process#${pid}: ${data}`);
        // });

        // processx.stdout.on('error', (data) => {
        //     console.error(`Process#${pid}: ${data}`);
        // });

        // processx.stderr.on('data', (data) => {
        //     console.error(`Process#${pid}: ${data}`);
        // });

        // processx.stderr.on('error', (data) => {
        //     console.error(`Process#${pid}: ${data}`);
        // });

        processx.on('close', (code) => {
            console.info(`Process#${pid} is about to be shut down`);
            const i = this.childProcesses.findIndex(
                (a) => a.process == processx,
            );
            if (i > -1) {
                this.childProcesses = this.childProcesses.splice(i, 1);
            }
            if (!this.closingStage) {
                this.spawnProcess(node, file, parameters, workerPort);
            }
        });

        this.childProcesses.push({
            port: workerPort,
            process: processx,
        });
    }
}
