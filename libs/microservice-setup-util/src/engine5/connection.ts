// import net = require("net"); // import 'net' module
import * as net from 'net';
import { Payload } from './payload';
import { encode, decode } from '@msgpack/msgpack';
import { DynamicQueue } from '@ubs-platform/dynamic-queue';
import { json } from 'stream/consumers';
import { ReplaySubject } from 'rxjs';
import { exec } from 'child_process';

export class Engine5Connection {
    tcpClient = new net.Socket();
    connectionStatus: "CONNECTING" | "CLOSED" | "CONNECTED" = "CLOSED";
    connectionStatusSubject: ReplaySubject<"CONNECTING" | "CLOSED" | "CONNECTED"> = new ReplaySubject(1);
    listeningSubjectCallbacks: { [key: string]: ((a: any) => any)[] } = {};
    ongoingRequestsToComplete: { [key: string]: (a: any) => void } = {};
    readonly queue = new DynamicQueue();
    reconnectOnFail = true;
    tcpClientEventsRegistered = false;
    // onGoingRequests: Map<string, ((a: any) => any)[]> = new Map();


    constructor(
        private host: string,
        private port: string | number,
        private instanceGroup?: string,
        private instanceId?: string,
    ) {
        this.connectionStatusSubject.next("CLOSED");
        this.queue.push(async () => {
            await this.runAtWhenConnected(() => {
                "This is for prevent add some events or requests before connection"
            })
        })


        setInterval(() => {
            if (this.reconnectOnFail && this.connectionStatus == "CLOSED") {
                console.info("Trying to establish a connection")
                this.init().then().catch(e => console.error(e));
            }
        }, 5000)
    }

    runAtWhenConnected(ac: () => any) {
        let completed = false;
        return new Promise((ok, fail) => {
            let subscription = null as any

            subscription = this.connectionStatusSubject.subscribe(async (a) => {
                if (!completed && a == "CONNECTED") {
                    completed = true;
                    subscription?.unsubscribe();
                    try {
                        const result = await ac()
                        ok(result)
                    } catch (e) {
                        fail(e)
                    }
                } else if (completed) {
                    subscription?.unsubscribe();
                }
            })
        })

    }

    async writePayload(p: Payload): Promise<Engine5Connection> {
        return new Promise((ok, fail) => {
            this.queue.push(() => {
                try {
                    const buff = Buffer.from([...encode(p), 4]);

                    this.tcpClient.write(buff, (e) => {
                        if (e) fail(e);
                        else ok(this);
                    });
                } catch (error) {
                    console.error(error);
                }
            })
        });
    }

    async listen(subject: string, cb: (a: any) => any) {
        console.info("Listening Subject: " + subject)
        this.queue.push(async () => {
            await this.writeListenCommand(subject);
            const ls = this.listeningSubjectCallbacks[subject] || [];
            ls.push(cb);
            this.listeningSubjectCallbacks[subject] = ls;
        });

    }

    private async writeListenCommand(subject: string) {
        await this.writePayload({
            Command: 'LISTEN',
            Subject: subject,
            MessageId: this.messageIdGenerate(),
        });
    }

    private messageIdGenerate(): string | undefined {
        return Date.now() + '_' + (Math.random() * 100000).toFixed();
    }

    async sendRequest(subject: string, data: any) {
        const messageId = Date.now() + '_' + (Math.random() * 100000).toFixed();
        if (!(this.connectionStatus == "CONNECTED")) {
            await this.init();
        }
        await this.writePayload({
            Command: 'REQUEST',
            Subject: subject,
            Content: JSON.stringify(data),
            MessageId: messageId,
        });
        return new Promise((ok, fail) => {
            this.ongoingRequestsToComplete[messageId] = (response: Payload) => {
                if (response.Content) {
                    const jsonObj = JSON.parse(response.Content!) as any;
                    ok(jsonObj);
                } else {
                    ok(undefined);
                }
            };
        });
    }

    async sendEvent(subject: string, data: any) {
        // this.runAtWhenConnected(async () => {

        // })
        // this.queue.push(() => {
        //     return new Promise((ok) => {
        //         this.connectionReady.subscribe((a) => {
        //             exec(`kdialog --msgbox "${a}"`)
        //             ok(null)
        //         })
        //     })

        // })
        await this.writePayload({
            Command: 'EVENT',
            Subject: subject,
            Content: JSON.stringify(data),
        });
    }
    // async sendEventStr(subject: string, data: string) {
    //   await this.writePayload({
    //     Command: "LISTEN",
    //     Subject: subject,
    //     Content: data,
    //   });
    // }

    async init() {
        return new Promise<Engine5Connection>((ok, fail) => {
            if (this.connectionStatus == "CLOSED") {
                this._init((v) => {
                    ok(v);
                });
            } else {
                this.runAtWhenConnected(() => {
                    ok(this)
                })
            }
        });
    }

    private _init(ok: (value: Engine5Connection | PromiseLike<Engine5Connection>) => void) {
        this.connectionStatusSubject.next("CONNECTING");
        this.connectionStatus = "CONNECTING"
        console.info('Connecting to server');
        const client = this.tcpClient;
        this.registerEvents(client, ok);

        client.connect(parseInt(this.port as any), this.host, () => {
            //   client.write("I am Chappie");
            this.startConnection();
        });
    }

    private registerEvents(client: net.Socket, ok: (value: Engine5Connection | PromiseLike<Engine5Connection>) => void) {
        if (this.tcpClientEventsRegistered) return
        let currentBuff: number[] = [];

        client.on('data', (data: Buffer) => {
            // console.info("Gelen data", data);
            this.queue.push(() => {
                let newBuffData = [...currentBuff, ...data];
                let splitByteIndex = newBuffData.indexOf(4);
                while (splitByteIndex > -1) {
                    const popped = newBuffData.slice(0, splitByteIndex);
                    this.processIncomingData(popped, ok);

                    newBuffData = newBuffData.slice(splitByteIndex + 1);
                    splitByteIndex = newBuffData.indexOf(4);
                }
                currentBuff = newBuffData;
            });
        });

        client.on('error', (err) => {
            console.error(`Error occured ${err}`);
        });

        client.on('close', async () => {
            this.connectionStatus = "CLOSED";
            this.connectionStatusSubject.next("CLOSED");
            console.log('Connection closed');
        });

        this.tcpClientEventsRegistered = true;
    }

    private startConnection() {
        this.writePayload({
            Command: 'CONNECT',
            InstanceId: this.instanceId || '',
            InstanceGroup: this.instanceGroup || this.instanceId
        });

        const alreadyListeningSubjects = Object.keys(this.listeningSubjectCallbacks);

        for (let alsIndex = 0; alsIndex < alreadyListeningSubjects.length; alsIndex++) {
            const als = alreadyListeningSubjects[alsIndex];
            this.writeListenCommand(als).then(() => console.info("Listening subject again: " + als)).catch(console.error)
        }
    }

    private async processIncomingData(
        data: any,
        promiseResolveFunc?: (
            value: Engine5Connection | PromiseLike<Engine5Connection>,
        ) => void,
    ) {
        const decoded: Payload = decode(data) as any as Payload;
        // console.info(decoded)
        if (decoded.Command == 'CONNECT_SUCCESS') {
            this.connectionStatus = "CONNECTED";
            this.connectionStatusSubject.next("CONNECTED");
            this.instanceId = decoded.InstanceId!;
            this.instanceGroup = decoded.InstanceGroup!
            promiseResolveFunc?.(this);
            // this.reconnectOnFail = true;
            console.info('Connected Successfully');
        } else if (decoded.Command == 'EVENT') {
            console.info('Event recieved', decoded.Subject);
            this.processReceivedEvent(decoded);
        } else if (decoded.Command == 'REQUEST') {
            console.info('Request recieved: ', decoded.Subject);
            try {
                const ac = await this.listeningSubjectCallbacks[
                    decoded.Subject!
                ][0](JSON.parse(decoded.Content!));
                // this.ongoingRequestsToComplete[decoded.MessageId!](ac)
                await this.writePayload({
                    Command: 'RESPONSE',
                    Content: JSON.stringify(ac),
                    MessageId: this.messageIdGenerate(),
                    Subject: decoded.Subject,
                    ResponseOfMessageId: decoded.MessageId,
                });
            } catch (ex) {
                console.error(ex);
            }
        } else if (decoded.Command == 'RESPONSE') {
            this.ongoingRequestsToComplete[decoded.ResponseOfMessageId!](
                decoded,
            );
        }
    }

    private processReceivedEvent(decoded: Payload) {
        const cbs = this.listeningSubjectCallbacks[decoded.Subject!] || [];
        for (
            let callbackIndex = 0;
            callbackIndex < cbs.length;
            callbackIndex++
        ) {
            const callback = cbs[callbackIndex];
            callback(JSON.parse(decoded.Content as string));
        }
    }

    async close() {
        debugger
        console.info("E5JSCL - Connection is about to be closed")
        this.reconnectOnFail = false;
        await this.writePayload({ "Command": "CLOSE" })
        // this.tcpClient.end();
        // this.connected = false;
    }


    private static globalE5Connections: { [key: string]: Engine5Connection } = {};

    public static create(host: string,
        port: string | number,
        instanceGroup?: string,
        instanceId?: string) {
        const key = `${instanceGroup}(${instanceId})@${host}:${port}`
        if (!this.globalE5Connections[key]) {
            const nk = new Engine5Connection(host, port, instanceGroup, instanceId);
            this.globalE5Connections[key] = nk;
        }

        return this.globalE5Connections[key];

    }
}

